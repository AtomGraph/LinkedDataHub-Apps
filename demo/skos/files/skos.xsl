<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xsl:stylesheet [
    <!ENTITY lacl   "https://w3id.org/atomgraph/linkeddatahub/admin/acl#">
    <!ENTITY ldh    "https://w3id.org/atomgraph/linkeddatahub#">
    <!ENTITY ac     "https://w3id.org/atomgraph/client#">
    <!ENTITY rdf    "http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <!ENTITY rdfs   "http://www.w3.org/2000/01/rdf-schema#">
    <!ENTITY xsd    "http://www.w3.org/2001/XMLSchema#">
    <!ENTITY skos   "http://www.w3.org/2004/02/skos/core#">
    <!ENTITY ldt    "https://www.w3.org/ns/ldt#">
    <!ENTITY dct    "http://purl.org/dc/terms/">
    <!ENTITY foaf   "http://xmlns.com/foaf/0.1/">
]>
<xsl:stylesheet version="2.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns:xhtml="http://www.w3.org/1999/xhtml"
xmlns:xs="http://www.w3.org/2001/XMLSchema"
xmlns:lacl="&lacl;"
xmlns:ac="&ac;"
xmlns:ldh="&ldh;"
xmlns:rdf="&rdf;"
xmlns:rdfs="&rdfs;"
xmlns:xsd="&xsd;"
xmlns:skos="&skos;"
xmlns:ldt="&ldt;"
xmlns:dct="&dct;"
xmlns:foaf="&foaf;"
xmlns:bs2="http://graphity.org/xsl/bootstrap/2.3.2"
exclude-result-prefixes="#all">

    <xsl:param name="ldh:base" as="xs:anyURI" static="yes"/>

    <xsl:import _href="{resolve-uri('static/com/atomgraph/linkeddatahub/xsl/bootstrap/2.3.2/layout.xsl', $ldh:base)}"/>

    <xsl:param name="foaf:Agent" as="document-node()?"/>

    <!-- keys used to lookup resources by property value -->
    <xsl:key name="resources-by-broader" match="*[@rdf:about] | *[@rdf:nodeID]" use="skos:broader/@rdf:resource"/>
    <xsl:key name="resources-by-narrower" match="*[@rdf:about] | *[@rdf:nodeID]" use="skos:narrower/@rdf:resource"/>
    <xsl:key name="resources-by-related" match="*[@rdf:about] | *[@rdf:nodeID]" use="skos:related/@rdf:resource"/>

    <xsl:template match="rdf:RDF" mode="xhtml:Style">
        <xsl:param name="load-wymeditor" select="not(empty($foaf:Agent//@rdf:about))" as="xs:boolean"/>

        <link href="{resolve-uri('static/css/bootstrap.css', $ac:contextUri)}" rel="stylesheet" type="text/css"/>
        <link href="{resolve-uri('static/css/bootstrap-responsive.css', $ac:contextUri)}" rel="stylesheet" type="text/css"/>
        <link href="{resolve-uri('static/com/atomgraph/client/css/bootstrap.css', $ac:contextUri)}" rel="stylesheet" type="text/css"/>
        <!-- override the CSS stylesheet with the on included in this app -->
        <link href="{resolve-uri('uploads/7266aea2cef4e442833433f80e46577144e8d668', $ldt:base)}" rel="stylesheet" type="text/css"/>
        <link href="{resolve-uri('static/com/atomgraph/linkeddatahub/css/bootstrap.css', $ac:contextUri)}" rel="stylesheet" type="text/css"/>

        <style type="text/css">
        <![CDATA[
            .modal-header, .modal-footer { background-color: #272b30; }
        ]]>
        </style>

        <xsl:if test="$load-wymeditor">
            <link href="{resolve-uri('static/com/atomgraph/linkeddatahub/js/wymeditor/skins/default/skin.css', $ac:contextUri)}" rel="stylesheet" type="text/css"/>
        </xsl:if>
    </xsl:template>

    <xsl:template match="rdf:RDF[$ac:mode = '&ac;QueryEditorMode']" mode="xhtml:Style" priority="1">
        <xsl:next-match/>
        
        <link href="{resolve-uri('static/css/yasqe.css', $ac:contextUri)}" rel="stylesheet" type="text/css"/>
    </xsl:template>

    <!-- this template will match resources that have a skos:broader property which objects are found in the current graph -->
    <xsl:template match="*[foaf:isPrimaryTopicOf/@rdf:resource = $ac:uri][key('resources-by-narrower', @rdf:about)] | *[foaf:isPrimaryTopicOf/@rdf:resource = $ac:uri][key('resources', skos:broader/@rdf:resource)]" mode="bs2:Block" priority="1">
        <xsl:next-match/>

        <h3>Broader concepts</h3>
        <ul>
            <xsl:apply-templates select="key('resources-by-narrower', @rdf:about) | key('resources', skos:broader/@rdf:resource)" mode="bs2:List">
                <xsl:sort select="ac:label(.)"/>
            </xsl:apply-templates>
        </ul>
    </xsl:template>

    <!-- this template will match resources that have a skos:narrower property which objects are found in the current graph -->
    <xsl:template match="*[foaf:isPrimaryTopicOf/@rdf:resource = $ac:uri][key('resources-by-broader', @rdf:about)] | *[foaf:isPrimaryTopicOf/@rdf:resource = $ac:uri][key('resources', skos:narrower/@rdf:resource)]" mode="bs2:Block" priority="1">
        <xsl:next-match/>

        <h3>Narrower concepts</h3>
        <ul>
            <xsl:apply-templates select="key('resources-by-broader', @rdf:about) | key('resources', skos:narrower/@rdf:resource)" mode="bs2:List">
                <xsl:sort select="ac:label(.)"/>
            </xsl:apply-templates>
        </ul>
    </xsl:template>

    <!-- this template will match resources that have a skos:related property which objects are found in the current graph -->
    <xsl:template match="*[foaf:isPrimaryTopicOf/@rdf:resource = $ac:uri][key('resources-by-related', @rdf:about)] | *[foaf:isPrimaryTopicOf/@rdf:resource = $ac:uri][key('resources', skos:related/@rdf:resource)]" mode="bs2:Block" priority="1">
        <xsl:next-match/>

        <h3>Related concepts</h3>
        <ul>
            <xsl:apply-templates select="key('resources-by-related', @rdf:about) | key('resources', skos:related/@rdf:resource)" mode="bs2:List">
                <xsl:sort select="ac:label(.)"/>
            </xsl:apply-templates>
        </ul>
    </xsl:template>

    <xsl:template match="*[key('resources', skos:narrower/@rdf:resource)/foaf:isPrimaryTopicOf/@rdf:resource = $ac:uri] | *[key('resources', skos:broader/@rdf:resource)/foaf:isPrimaryTopicOf/@rdf:resource = $ac:uri] | *[key('resources', skos:related/@rdf:resource)/foaf:isPrimaryTopicOf/@rdf:resource = $ac:uri] | *[@rdf:about = key('resources', key('resources', $ac:uri)/foaf:primaryTopic/@rdf:resource)/skos:narrower/@rdf:resource] | *[@rdf:about = key('resources', key('resources', $ac:uri)/foaf:primaryTopic/@rdf:resource)/skos:broader/@rdf:resource] | *[@rdf:about = key('resources', key('resources', $ac:uri)/foaf:primaryTopic/@rdf:resource)/skos:related/@rdf:resource]" mode="bs2:Block"/>

    <xsl:template match="*[foaf:isPrimaryTopicOf/@rdf:resource = $ac:uri][key('resources', skos:broader/@rdf:resource)]/skos:broader | *[foaf:isPrimaryTopicOf/@rdf:resource = $ac:uri][key('resources', skos:narrower/@rdf:resource)]/skos:narrower | *[foaf:isPrimaryTopicOf/@rdf:resource = $ac:uri][key('resources', skos:related/@rdf:resource)]/skos:related" mode="bs2:PropertyList"/>

</xsl:stylesheet>