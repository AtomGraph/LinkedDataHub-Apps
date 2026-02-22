<?xml version="1.0" encoding="UTF-8"?>
<!-- This stylesheet is responsible for decorating a plain XHTML page generated from the Turtle data files -->
<!-- Those pages don't include any boilerplate text or navigation; this stylesheet can add them -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" 
    xmlns:convert="tag:conaltuohy.com,2021:convert-ttl-to-html" xmlns="http://www.w3.org/1999/xhtml" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:map="http://www.w3.org/2005/xpath-functions/map" xmlns:json="http://www.w3.org/2005/xpath-functions" xpath-default-namespace="http://www.w3.org/1999/xhtml"
    exclude-result-prefixes="#all">

    <xsl:mode on-no-match="shallow-copy"/>
    
    <xsl:template match="head">
        <xsl:copy>
            <xsl:apply-templates/>
            <!-- add CSS -->
            <link href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/files/css/bootstrap.css" rel="stylesheet" type="text/css"/>
            <link href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/files/css/bootstrap-responsive.css" rel="stylesheet" type="text/css"/>
            <link href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/files/css/linkeddatahub-bootstrap.css" rel="stylesheet" type="text/css"/>
            <style type="text/css">
                body { padding-top: 60px; }
                object { width: 100%; min-height: 640px; }
            </style>
            <script type="text/javascript" src="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/files/js/jquery.min.js"/>
            <script type="text/javascript" src="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/files/js/bootstrap.min.js"/>
            <script type="text/javascript">
                $(document).ready(function()
                {

                    $("ul.nav-tabs a").on("click", function()
                    {
                        $(this).closest("ul").children().toggleClass("active", false); // deactivate other tabs
                        $(this).closest("li").toggleClass("active", true); // activate this tab
                        $(this).closest("ul").next().children().toggleClass("active", false); // deactivate other tab panes
                        $(this).closest("ul").next().children().eq($(this).closest("li").index()).toggleClass("active", true); // activate this tab pane
                    });

                });
            </script>
            <!-- Global site tag (gtag.js) - Google Analytics -->
            <script async="async" src="https://www.googletagmanager.com/gtag/js?id=UA-38402002-6"></script>
            <script>
                <![CDATA[
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());

                    gtag('config', 'UA-38402002-6');
                ]]>
            </script>
        </xsl:copy>
    </xsl:template>
    
    <xsl:template match="title/text()">
        <xsl:value-of select=" 'LinkedDataHub v5 - ' || . "/>
    </xsl:template>
    
    <xsl:template match="body">
        <xsl:param name="outline" tunnel="yes"/><!-- an unordered list of items containing hyperlinks or nested unordered lists -->
        <xsl:param name="children" tunnel="yes"/><!-- an unordered list of items containing hyperlinks to subordinate resources -->
        <xsl:copy>
            <div class="navbar navbar-fixed-top">
                <div class="navbar-inner">
                    <div class="container-fluid">
                        <a class="brand" href="https://atomgraph.github.io/LinkedDataHub/">LinkedDataHub</a>
                        <div class="nav-collapse collapse">
                            <ul class="nav">
                                <li class="active">
                                    <div class="btn-group">
                                        <a class="btn" href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/">Documentation v5</a>
                                        <button class="btn dropdown-toggle" data-toggle="dropdown">
                                            <span class="caret"></span>
                                        </button>
                                        <ul class="dropdown-menu">
                                            <li>
                                                <a href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/v3/">Documentation v3</a>
                                            </li>
                                            <li>
                                                <a href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/v2/">Documentation v2</a>
                                            </li>
                                        </ul>
                                    </div>
                                </li>
                                <li><a href="https://github.com/AtomGraph/LinkedDataHub" target="_blank">Code</a></li>
                            </ul>
                         </div>
                     </div>
                 </div>
            </div>
            <div class="container-fluid">
                <div class="row-fluid">
                    <nav class="span2">
                        <!-- <h2>LinkedDataHub v3</h2> -->

                        <xsl:copy-of select="$outline"/>
                    </nav>
                    <main class="span7">
                        <header>
                            <h1><xsl:value-of select="/html/head/title"/></h1>
                        </header>
                        <!-- copy the remaining content -->
                        <xsl:apply-templates/>
                        <nav>
                            <xsl:sequence select="$children"/>
                        </nav>
                    </main>
                </div>
            </div>
            <div class="footer container-fluid">
             <div class="row-fluid">
                <div class="offset2 span8">
                   <div class="span3">
                      <h2 class="nav-header">About</h2>
                      <ul class="nav nav-list">
                         <li><a href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/about/" target="_blank">LinkedDataHub</a></li>
                         <li><a href="https://atomgraph.com" target="_blank">AtomGraph</a></li>
                      </ul>
                   </div>
                   <div class="span3">
                      <h2 class="nav-header">Resources</h2>
                      <ul class="nav nav-list">
                         <li><a href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/" target="_blank">Documentation</a></li>
                         <li><a href="https://www.youtube.com/channel/UCtrdvnVjM99u9hrjESwfCeg" target="_blank">Screencasts</a></li>
                      </ul>
                   </div>
                   <div class="span3">
                      <h2 class="nav-header">Support</h2>
                      <ul class="nav nav-list">
                         <li><a href="https://groups.io/g/linkeddatahub" target="_blank">Mailing list</a></li>
                         <li><a href="https://github.com/AtomGraph/LinkedDataHub/issues" target="_blank">Report issues</a></li>
                         <li><a href="mailto:support@linkeddatahub.com">Contact support</a></li>
                      </ul>
                   </div>
                   <div class="span3">
                      <h2 class="nav-header">Follow us</h2>
                      <ul class="nav nav-list">
                         <li><a href="https://twitter.com/atomgraphhq" target="_blank">@atomgraphhq</a></li>
                         <li><a href="https://github.com/AtomGraph" target="_blank">github.com/AtomGraph</a></li>
                      </ul>
                   </div>
                </div>
             </div>
          </div>
        </xsl:copy>
    </xsl:template>
    
    <!-- omit tabs with "LinkedDataHub Cloud", leave only the active tab content -->
    <xsl:template match="div[@class = 'tabbable'][ul/li/a/text() = 'LinkedDataHub Cloud']">
        <xsl:apply-templates select="./div[@class = 'tab-content']/div[contains-token(@class, 'active')]/*"/>
    </xsl:template>

    <xsl:key name="file-by-sha1"
            match="json:map/json:array[@key='files']/json:map"
            use="json:string[@key='sha1']"/>

    <xsl:template match="img/@src[contains(., 'uploads/')] | object/@data[contains(., 'uploads/')]">
        <xsl:param name="file-xml" select="document('files.xml')" as="document-node()"/>
        <xsl:param name="upload-hash" select="substring-after(., 'uploads/')" as="xs:string"/>

        <xsl:variable name="match" select="key('file-by-sha1', $upload-hash, $file-xml)"/>

        <xsl:choose>
            <xsl:when test="$match">
                <xsl:attribute name="{local-name()}"
                    select="substring-before(., 'uploads/') || 'files/' || xs:anyURI($match/json:string[@key='name'])"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:message terminate="yes">
                    Could not find file for hash '<xsl:value-of select="$upload-hash"/>'
                </xsl:message>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
</xsl:stylesheet>