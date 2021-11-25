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
			<style type="text/css" xsl:expand-text="false">
				body {
					color: #04286E;
					font-family: "Rubik", "Helvetica Neue", "Helvetica", Helvetica, Arial, sans-serif;
					display: grid;
					grid-auto-columns: max-content;
				}
				body > header {
					grid-row: 1;
					grid-column: 1 / 2;
				}
				nav.outline {
					background-color: #fff;
					background-clip: border-box;
					border: 1px solid rgba(0,0,0,.125);
					margin: 0.5em;
					width: 20em;
					grid-row: 2;
					grid-column: 1;
				}
				main {
					grid-row: 2;
					grid-column: 2;
				}
				nav.outline ul li {
					margin-top: 0.2em;
					margin-bottom: 0.3em;
				}
				nav.outline ul {
					font-size: small;
					padding-left: 2em;
					margin-top: 0.1em;
					margin-bottom: 0.3em;
					list-style-type: none;
				}
				p.lead {
					font-size: larger;
					font-style: italic;
				}
			</style>
		</xsl:copy>
	</xsl:template>
	
	<xsl:template match="title/text()">
		<xsl:value-of select=" 'LinkedDataHub - ' || . "/>
	</xsl:template>
	
	<xsl:template match="body">
		<xsl:param name="outline" tunnel="yes"/><!-- an unordered list of items containing hyperlinks or nested unordered lists -->
		<xsl:copy>
			<header><h1>LinkedDataHub</h1></header>
			<nav class="outline">
				<xsl:copy-of select="$outline"/>
			</nav>
			<main>
				<header>
					<h2><xsl:value-of select="/html/head/title"/></h2>
				</header>
				<!-- insert the <body> content -->
				<xsl:apply-templates/>
			</main>
		</xsl:copy>
	</xsl:template>
	
</xsl:stylesheet>