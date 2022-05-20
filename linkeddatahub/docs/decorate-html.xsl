<?xml version="1.0" encoding="UTF-8"?>
<!-- This stylesheet is responsible for decorating a plain XHTML page generated from the Turtle data files -->
<!-- Those pages don't include any boilerplate text or navigation; this stylesheet can add them -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" 
    xmlns:convert="tag:conaltuohy.com,2021:convert-ttl-to-html" xmlns="http://www.w3.org/1999/xhtml" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:map="http://www.w3.org/2005/xpath-functions/map" xpath-default-namespace="http://www.w3.org/1999/xhtml"
    exclude-result-prefixes="#all">

    <xsl:mode on-no-match="shallow-copy"/>
    
    <xsl:template match="head">
        <xsl:copy>
            <xsl:apply-templates/>
            <!-- add CSS -->
            <link href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/css/bootstrap.css" rel="stylesheet" type="text/css"/>
            <link href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/css/bootstrap-responsive.css" rel="stylesheet" type="text/css"/>
            <style type="text/css">
                body { padding-top: 60px; }
                object { width: 100%; min-height: 640px; }
            </style>
            <script type="text/javascript" src="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/js/jquery.min.js"/>
            <script type="text/javascript" src="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/js/bootstrap.min.js"/>
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
        <xsl:value-of select=" 'LinkedDataHub v3 - ' || . "/>
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
                                        <a class="btn" href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/">Documentation v3</a>
                                        <button class="btn dropdown-toggle" data-toggle="dropdown">
                                            <span class="caret"></span>
                                        </button>
                                        <ul class="dropdown-menu">
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
                        <h2>LinkedDataHub v3</h2>

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

    <!-- trim the trailing slash -->
    <xsl:template match="img/@src[contains(., 'uploads/')] | object/@data[contains(., 'uploads/')]">
        <xsl:param name="file-uploads" as="map(xs:string, xs:anyURI)">
            <xsl:map>
                <xsl:map-entry key="'8c17ca6be73aabfab3028d9b06b4878ef6c300e7'" select="xs:anyURI('files/images/signup.png')"/>
                <xsl:map-entry key="'704f6e248ef0151a8241f1ef74e1b78225433fc7'" select="xs:anyURI('files/images/request-access1.png')"/>
                <xsl:map-entry key="'e81e9a3b41b96016b6d81c1eb719e52a533a5733'" select="xs:anyURI('files/images/request-access2.png')"/>
                <xsl:map-entry key="'4656ea9036a2b6d48a3233e0bc3cdc0f698ae0f2'" select="xs:anyURI('files/images/action.png')"/>
                <xsl:map-entry key="'38d12825c3927e2d5493ca76f2b744c7b5fe867b'" select="xs:anyURI('files/images/change-layout-augment.png')"/>
                <xsl:map-entry key="'74b49af5c822acf41ad661d0d27a60443151838d'" select="xs:anyURI('files/images/change-layout-default.png')"/>
                <xsl:map-entry key="'e1a566461208a41faee39238f395f2f79fec8421'" select="xs:anyURI('files/images/change-layout-suppress.png')"/>
                <xsl:map-entry key="'3cbf6ccd5f92b84111e2425263da050db0e4663f'" select="xs:anyURI('files/images/contexts.svg')"/>
                <xsl:map-entry key="'44c15645d600ae3cb74ce7ba85e814726b631e25'" select="xs:anyURI('files/images/create context.png.png')"/>
                <xsl:map-entry key="'fa4ec808c4dca4fe6b5a610d3e028ad48f8ed9af'" select="xs:anyURI('files/images/create edit.png')"/>
                <xsl:map-entry key="'5aedc6ac31996b7332623edcd91dc3864c51df8c'" select="xs:anyURI('files/images/layout.png')"/>
                <xsl:map-entry key="'cd27577395dec18a2b3fb5867feeb60fe828cb43'" select="xs:anyURI('files/images/navigation bar.png')"/>
                <xsl:map-entry key="'fbce3e0e3ea48e51985e999f4c3ef66e7a7aaa52'" select="xs:anyURI('files/images/ontologies.svg')"/>
                <xsl:map-entry key="'8c4383351477a5405a9883d23d9255670b9396f7'" select="xs:anyURI('files/images/search.png')"/>
                <xsl:map-entry key="'9e1d4e69c4a0ae30f5fa373db839dc46b3569685'" select="xs:anyURI('files/images/sparql endpoint.jpg')"/>
                <xsl:map-entry key="'8c2ccf560bd4d582310f472d7a7bd2584d9da4bf'" select="xs:anyURI('files/images/browse-data.png')"/>
                <xsl:map-entry key="'73e3f6ba966796c54e25c5dc41057e36471ae554'" select="xs:anyURI('files/videos/AddData.webm')"/>
                <xsl:map-entry key="'490945931415b9ab201ed85f296a84c8a11134d1'" select="xs:anyURI('files/videos/Create.webm')"/>
                <xsl:map-entry key="'4c86a3410134d090a7bb7e178a6f82874bc66fa1'" select="xs:anyURI('files/videos/CreateContextDataspace.webm')"/>
                <xsl:map-entry key="'121916e2a51476351451c218b1a6dec9de2e7774'" select="xs:anyURI('files/videos/Delete.webm')"/>
                <xsl:map-entry key="'9f9c3fc45ed41d6dad05762b501512b002f0efc5'" select="xs:anyURI('files/videos/Download.webm')"/>
                <xsl:map-entry key="'30d8cc764648ebd67497413b16a94fca56c8e1e4'" select="xs:anyURI('files/videos/Edit.webm')"/>
                <xsl:map-entry key="'7db898019986d1aa0bfee7bd1423874d82cb0233'" select="xs:anyURI('files/videos/Upload.webm')"/>
                <xsl:map-entry key="'d9ec2ef2b2f1268affa6deb3f3f971bdf6a56b64'" select="xs:anyURI('files/videos/View.webm')"/>
                <xsl:map-entry key="'48a29226674c16723226492b01210eb8be58a407'" select="xs:anyURI('files/videos/DocTree.gif')"/>
                <xsl:map-entry key="'ffb24b79848a40266d880638b0699c4c8a4e41ec'" select="xs:anyURI('files/videos/ParallaxNav.gif')"/>
            </xsl:map>
        </xsl:param>
        <xsl:param name="upload-hash" select="substring-after(., 'uploads/')" as="xs:string"/>

        <xsl:choose>
            <xsl:when test="map:contains($file-uploads, $upload-hash)">
                <xsl:attribute name="{local-name()}" select="substring-before(., 'uploads/') || map:get($file-uploads, $upload-hash)"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:message terminate="yes">Could not find filename -&gt; upload hash mapping</xsl:message>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    
</xsl:stylesheet>