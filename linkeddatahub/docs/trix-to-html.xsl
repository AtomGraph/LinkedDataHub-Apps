<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" 
	xmlns:trix="http://www.w3.org/2004/03/trix/trix-1/" xmlns:convert="tag:conaltuohy.com,2021:convert-ttl-to-html" xmlns="http://www.w3.org/1999/xhtml"
	exclude-result-prefixes="#all">
	
	<xsl:output method="text"/>
	
	<xsl:import href="decorate-html.xsl"/>
	
	<!-- folder where the XHTML files are written --> 
	<xsl:param name="output-folder" select="'html'"/>
	
	<!-- generate an HTML filename for each resource -->
	<xsl:function name="convert:filename-for-resource">
		<xsl:param name="resource"/>
		<xsl:sequence select="replace($resource, '^file://(/.*/?)$', '$1index.html')"/>
	</xsl:function>
	
	<xsl:function name="convert:relativize-uri-segments">
		<xsl:param name="uri-segments"/>
		<xsl:param name="base-uri-segments"/>
		<xsl:choose>
			<xsl:when test="head($uri-segments) = head($base-uri-segments)">
				<xsl:sequence select="convert:relativize-uri-segments(tail($uri-segments), tail($base-uri-segments))"/>
			</xsl:when>
			<xsl:otherwise>
				<!-- the base uri segments must be converted to '..' and followed by the uri segments -->
				<xsl:sequence select="
					(
						for $base-segment in tail($base-uri-segments) return '..',
						$uri-segments
					)
				"/>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:function>
	
	<xsl:function name="convert:relativize-uri">
		<!-- returns a version of a root-relative $uri which is made relative to the root-relative $base-uri -->
		<!-- e.g. convert:relativize-uri('/foo/bar/baz/index.html', '/foo/bar/quux/bong/index.html') = '../../baz/index.html' -->
		<!-- if the $uri does not begin with '/' then it is returned unchanged -->
		<xsl:param name="uri"/>
		<xsl:param name="base-uri"/>
		<xsl:choose>
			<xsl:when test="starts-with($uri, '/')">
				<xsl:variable name="uri-segments" select="tail(tokenize($uri, '/'))"/>
				<xsl:variable name="base-uri-segments" select="tail(tokenize($base-uri, '/'))"/>
				<xsl:variable name="relative-uri-segments" select="convert:relativize-uri-segments($uri-segments, $base-uri-segments)"/>
				<xsl:sequence select="string-join($relative-uri-segments, '/')"/>
			</xsl:when>
			<xsl:otherwise>
				<xsl:sequence select="$uri"/>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:function>
	
	<xsl:template match="trix:trix">
		<!-- process all the graphs into HTML pages -->
		<xsl:apply-templates/>
	</xsl:template>
		
	<!-- render a graph as an HTML page -->
	<xsl:template match="trix:graph">
		<xsl:variable name="graph" select="."/>
		<!-- the resource identifier is taken to be the subject of the first triple -->
		<xsl:variable name="resource" select="string(trix:triple[1]/trix:uri[1])"/>
		<xsl:variable name="output-file" select="$output-folder || convert:filename-for-resource($resource)"/>
		<xsl:message select="$output-file"/>
		<!-- 
		properties used:
			http://www.w3.org/1999/02/22-rdf-syntax-ns#type
			http://rdfs.org/sioc/ns#has_parent
			https://www.w3.org/ns/ldt/document-hierarchy#select
			http://purl.org/dc/terms/title
			http://purl.org/dc/terms/description
			http://rdfs.org/sioc/ns#has_container
			http://www.w3.org/2000/01/rdf-schema#seeAlso
		-->
		<xsl:result-document href="{$output-file}" method="xhtml" html-version="5">
			<xsl:variable name="plain-html">
				<html>
					<head>
						<title><xsl:value-of select="convert:get-objects($graph, $resource, 'http://purl.org/dc/terms/title')"/></title>
						<meta name="description" content="{convert:get-objects(., $resource, 'http://purl.org/dc/terms/description')}"/>
						<xsl:for-each select="
							(
								convert:get-objects($graph, $resource, 'http://rdfs.org/sioc/ns#has_container'), 
								convert:get-objects($graph, $resource, 'http://rdfs.org/sioc/ns#has_parent')
							)
						">
							<link rel="up" href="{convert:relativize-uri(convert:filename-for-resource(.), convert:filename-for-resource($resource))}"/>
						</xsl:for-each>
						<xsl:for-each select="convert:get-objects($graph, $resource, 'http://www.w3.org/2000/01/rdf-schema#seeAlso')">
							<xsl:variable name="see-also-resource" select="."/>
							<link rel="http://www.w3.org/2000/01/rdf-schema#seeAlso" href="{$see-also-resource}" title="{convert:get-objects($graph, $see-also-resource, 'http://purl.org/dc/terms/title')}"/>
						</xsl:for-each>
					</head>
					<body>
						<!-- TO-DO: make generic -->
						<xsl:copy-of select="convert:get-objects(., convert:get-objects(., $resource, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#_1'), 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value')/*"/>
						<xsl:copy-of select="convert:get-objects(., convert:get-objects(., $resource, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#_2'), 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value')/*"/>
						<xsl:copy-of select="convert:get-objects(., convert:get-objects(., $resource, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#_3'), 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value')/*"/>
						<xsl:copy-of select="convert:get-objects(., convert:get-objects(., $resource, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#_4'), 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value')/*"/>
						<xsl:copy-of select="convert:get-objects(., convert:get-objects(., $resource, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#_5'), 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value')/*"/>
					</body>
				</html>
			</xsl:variable>
			<xsl:variable name="outline">
				<xsl:call-template name="generate-outline">
					<xsl:with-param name="base-uri" select="convert:filename-for-resource($resource)"/>
					<xsl:with-param name="parent-resource" select=" 'file:///' "/>
				</xsl:call-template>
			</xsl:variable>
			<xsl:variable name="children">
				<xsl:call-template name="generate-child-list">
					<xsl:with-param name="base-uri" select="convert:filename-for-resource($resource)"/>
					<xsl:with-param name="parent-resource" select="$resource"/>
				</xsl:call-template>
			</xsl:variable>
			<!-- 
				Allow the decorate-html.xsl stylesheet to decorate the plain html document, including formatting of the
				outline of the documentation corpus, and the list of children of the current resource
			-->
			<xsl:apply-templates select="$plain-html">
				<xsl:with-param name="outline" select="$outline" tunnel="yes"/>
				<xsl:with-param name="children" select="$children" tunnel="yes"/>
			</xsl:apply-templates>
		</xsl:result-document>
	</xsl:template>
	<!-- retrieve objects from triples with a given subject and predicate -->
	<xsl:function name="convert:get-objects">
		<xsl:param name="graph"/>
		<xsl:param name="subject"/>
		<xsl:param name="predicate"/>
		<xsl:sequence select="$graph/trix:triple[*[1]=$subject][*[2]=$predicate]/*[3]"/>
	</xsl:function>
	<!-- retrieve subjects from triples with a given predicate and object -->
	<xsl:function name="convert:get-subjects">
		<xsl:param name="graph"/>
		<xsl:param name="predicate"/>
		<xsl:param name="object"/>
		<xsl:sequence select="$graph/trix:triple[*[2]=$predicate][*[3]=$object]/*[1]"/>
	</xsl:function>
	<xsl:template name="generate-child-list">
		<xsl:param name="parent-resource"/>
		<xsl:param name="base-uri"/>
		<xsl:where-populated>
            <!-- generate a list of the resources which have this resource as their parent or container -->
            <xsl:for-each select="
                convert:get-subjects( (: find resources ... :)
                    /trix:trix/trix:graph, (: within any graph :)
                    ('http://rdfs.org/sioc/ns#has_container', 'http://rdfs.org/sioc/ns#has_parent'), (: which have a container or parent :) 
                    $parent-resource (: which is the parent resource :)
                )
            ">
				<div class="well">
					<h2>
						<a 
							href="{convert:relativize-uri(convert:filename-for-resource(.), $base-uri)}" 
							title="{convert:get-objects(/trix:trix/trix:graph, ., 'http://purl.org/dc/terms/description')}"
						>
							<xsl:value-of select="convert:get-objects(/trix:trix/trix:graph, ., 'http://purl.org/dc/terms/title')"/>
						</a>
					</h2>
                    <xsl:if test="convert:get-objects(/trix:trix/trix:graph, ., 'http://purl.org/dc/terms/description')">
                        <p>
                            <xsl:value-of select="convert:get-objects(/trix:trix/trix:graph, ., 'http://purl.org/dc/terms/description')"/>
                        </p>
                    </xsl:if>
				</div>
			</xsl:for-each>
		</xsl:where-populated>	
	</xsl:template>
	<!-- generate a hierarchical outline of the entire corpus -->
	<xsl:template name="generate-outline">
		<xsl:param name="parent-resource"/>
		<xsl:param name="base-uri"/>
		<xsl:variable name="resource-statements" select="/trix:trix/trix:graph/trix:triple[*[1]=$parent-resource]"/>
		<!-- exclude the top-level document -->
		<xsl:if test="not($parent-resource = 'file:///')">
			<a href="{convert:relativize-uri(convert:filename-for-resource($parent-resource), $base-uri)}" title="{$resource-statements[*[2]='http://purl.org/dc/terms/description'][1]/*[3]}">
				<xsl:value-of select="$resource-statements[*[2]='http://purl.org/dc/terms/title'][1]/*[3]"/>
			</a>
		</xsl:if>
		<xsl:where-populated>
			<ul class="nav nav-list">
				<!-- generate an outline for each resource which has this resource as its parent or container -->
				<xsl:for-each select="
					convert:get-subjects( (: find resources ... :)
						/trix:trix/trix:graph, (: within any graph :)
						('http://rdfs.org/sioc/ns#has_container', 'http://rdfs.org/sioc/ns#has_parent'), (: which have a container or parent :) 
						$parent-resource (: which is the parent resource :)
					)
				">
					<li>
						<!-- mark the current document as active -->
						<xsl:if test="convert:relativize-uri(convert:filename-for-resource(.), $base-uri) = ''">
							<xsl:attribute name="class">active</xsl:attribute>
						</xsl:if>
					
						<xsl:call-template name="generate-outline">
							<xsl:with-param name="parent-resource" select="."/>
							<xsl:with-param name="base-uri" select="$base-uri"/>
						</xsl:call-template>
					</li>
				</xsl:for-each>
			</ul>
		</xsl:where-populated>
	</xsl:template>
</xsl:stylesheet>