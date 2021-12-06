<?xml version="1.0" encoding="UTF-8"?>
<!-- This stylesheet is responsible for decorating a plain XHTML page generated from the Turtle data files -->
<!-- Those pages don't include any boilerplate text or navigation; this stylesheet can add them -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" 
	xmlns:convert="tag:conaltuohy.com,2021:convert-ttl-to-html" xmlns="http://www.w3.org/1999/xhtml" xpath-default-namespace="http://www.w3.org/1999/xhtml"
	exclude-result-prefixes="convert">
	<xsl:mode on-no-match="shallow-copy"/>
	
	<xsl:template match="head">
		<xsl:copy>
			<xsl:apply-templates/>
			<!-- add CSS -->
			<link href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/bootstrap.css" rel="stylesheet" type="text/css"/>
			<link href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/bootstrap-responsive.css" rel="stylesheet" type="text/css"/>
			<style type="text/css">
				body { padding-top: 60px; }
			</style>
		</xsl:copy>
	</xsl:template>
	
	<xsl:template match="title/text()">
		<xsl:value-of select=" 'LinkedDataHub - ' || . "/>
	</xsl:template>
	
	<xsl:template match="body">
		<xsl:param name="outline" tunnel="yes"/><!-- an unordered list of items containing hyperlinks or nested unordered lists -->
		<xsl:param name="children" tunnel="yes"/><!-- an unordered list of items containing hyperlinks to subordinate resources -->
		<xsl:copy>
			<div class="navbar navbar-fixed-top">
				<div class="navbar-inner">
					<div class="container-fluid">
						<a class="brand" href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/">Documentation</a>
						<div class="nav-collapse collapse">
							<ul class="nav">
								<li class="active"><a href="https://atomgraph.github.io/LinkedDataHub/" target="_blank">Home</a></li>
								<li><a href="https://github.com/AtomGraph/LinkedDataHub" target="_blank">Code</a></li>
							</ul>
						 </div>
					 </div>
				 </div>
			</div>
			<div class="container-fluid">
				<div class="row-fluid">
					<nav class="span2">
						<xsl:copy-of select="$outline"/>
					</nav>
					<main class="span7">
						<header>
							<h1><xsl:value-of select="/html/head/title"/></h1>
							<!-- include any "lead" paragraphs from the boxy here -->
							<xsl:copy-of select="child::div/p[@class='lead']"/>
						</header>
						<nav>
							<xsl:sequence select="$children"/>
						</nav>
						<!-- copy the remaining content -->
						<xsl:apply-templates/>
					</main>
				</div>
			</div>
		</xsl:copy>
	</xsl:template>
	
	<xsl:template match="p[@class='lead']"/><!-- filter these from the main content as they're included specifically in the main header instead -->
	
</xsl:stylesheet>