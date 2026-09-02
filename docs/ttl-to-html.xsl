<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    xmlns:dct="http://purl.org/dc/terms/"
    xmlns:dh="https://www.w3.org/ns/ldt/document-hierarchy#"
    xmlns:ldh="https://w3id.org/atomgraph/linkeddatahub#"
    xmlns:xhtml="http://www.w3.org/1999/xhtml"
    xmlns:json="http://www.w3.org/2005/xpath-functions"
    xmlns:local="urn:local:functions"
    xmlns="http://www.w3.org/1999/xhtml"
    exclude-result-prefixes="#all">

    <!-- primary output is suppressed; all pages are written via xsl:result-document -->
    <xsl:output method="text"/>

    <xsl:param name="docs-dir" as="xs:string" select="'/docs'"/>
    <xsl:param name="rdf-dir" as="xs:string" select="'/rdf'"/>
    <xsl:param name="output-folder" as="xs:string" select="'/output'"/>
    <xsl:param name="site-base-url" as="xs:string" select="'https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/'"/>

    <!-- all RDF/XML documents — sidecar for nav and child discovery only -->
    <xsl:variable name="all-docs" select="collection('file://' || $rdf-dir || '?select=*.rdf;recurse=yes;content-type=application/xml')"/>

    <!-- sha1 hash → filename mapping for uploads/ references -->
    <xsl:variable name="files-xml" select="document('file://' || $docs-dir || '/files.xml')"/>

    <xsl:key name="file-by-sha1"
        match="json:map/json:array[@key='files']/json:map"
        use="json:string[@key='sha1']"/>

    <!-- doc path → source .ttl modification time -->
    <xsl:variable name="timestamps-xml" select="document('file://' || $docs-dir || '/timestamps.xml')"/>

    <xsl:key name="timestamp-by-path" match="json:string" use="@key"/>

    <!--
        Derive the logical resource URI from a node's document base URI.
        riot outputs the main resource as rdf:about="" (relative to base), so we cannot
        rely on @rdf:about for identity. Instead we reconstruct from the file path:
          file:/docs/user-guide/search-data.rdf  →  file:/user-guide/search-data/
    -->
    <xsl:function name="local:resource-uri" as="xs:string">
        <xsl:param name="node" as="node()"/>
        <!-- Saxon may emit file:/path or file:///path; normalize to absolute path first -->
        <xsl:variable name="abs-path" select="replace(base-uri($node), '^file:/*', '/')"/>
        <xsl:variable name="rel" select="substring-after($abs-path, $rdf-dir)"/>
        <xsl:sequence select="'file:' || replace($rel, '\.rdf$', '/')"/>
    </xsl:function>

    <!-- ==================== INITIAL TEMPLATE ==================== -->

    <xsl:template name="main">
        <xsl:apply-templates select="$all-docs/rdf:RDF"/>

        <!-- synthetic root index.html — no TTL source exists for the docs root -->
        <xsl:variable name="root-base-path" as="xs:string" select="'/'"/>
        <xsl:variable name="top-level-docs" select="$all-docs/rdf:RDF[resolve-uri('../', local:resource-uri(.)) = 'file:/']"/>
        <xsl:result-document href="{$output-folder}/index.html" method="xhtml" html-version="5">
            <html lang="en" data-retro="m3" data-theme="light">
                <xsl:call-template name="html-head">
                    <xsl:with-param name="title" select="'Documentation'"/>
                </xsl:call-template>
                <body class="app">
                    <xsl:call-template name="navbar">
                        <xsl:with-param name="brand-href" select="''"/>
                    </xsl:call-template>
                    <div class="docs-layout">
                        <nav class="docs-nav">
                            <ul class="nav nav-list">
                                <!-- current-uri = 'file:/' — none of the nav items match, so no active class -->
                                <xsl:apply-templates select="$top-level-docs" mode="nav">
                                    <xsl:sort select="rdf:Description[rdf:type/@rdf:resource = ('https://www.w3.org/ns/ldt/document-hierarchy#Item', 'https://www.w3.org/ns/ldt/document-hierarchy#Container')]/dct:title"/>
                                    <xsl:with-param name="current-uri" select="'file:/'" tunnel="yes"/>
                                    <xsl:with-param name="base-path" select="$root-base-path" tunnel="yes"/>
                                </xsl:apply-templates>
                            </ul>
                        </nav>
                        <main class="docs-main">
                            <xsl:apply-templates select="$top-level-docs" mode="child-item">
                                <xsl:sort select="rdf:Description[rdf:type/@rdf:resource = ('https://www.w3.org/ns/ldt/document-hierarchy#Item', 'https://www.w3.org/ns/ldt/document-hierarchy#Container')]/dct:title"/>
                                <xsl:with-param name="base-path" select="$root-base-path" tunnel="yes"/>
                            </xsl:apply-templates>
                        </main>
                    </div>
                    <xsl:call-template name="footer"/>
                </body>
            </html>
        </xsl:result-document>

        <!-- sitemap.xml -->
        <xsl:result-document href="{$output-folder}/sitemap.xml" method="xml" indent="yes">
            <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                <url>
                    <loc><xsl:value-of select="$site-base-url"/></loc>
                </url>
                <xsl:for-each select="$timestamps-xml/json:map/json:string">
                    <xsl:sort select="@key"/>
                    <url>
                        <loc><xsl:value-of select="$site-base-url || substring-after(@key, '/')"/></loc>
                        <lastmod><xsl:value-of select="."/></lastmod>
                    </url>
                </xsl:for-each>
            </urlset>
        </xsl:result-document>
    </xsl:template>

    <!-- ==================== ONE PAGE PER RDF DOCUMENT ==================== -->

    <xsl:template match="/rdf:RDF">
        <xsl:variable name="resource" select="rdf:Description[rdf:type/@rdf:resource = ('https://www.w3.org/ns/ldt/document-hierarchy#Item', 'https://www.w3.org/ns/ldt/document-hierarchy#Container')]"/>
        <xsl:variable name="resource-uri" select="local:resource-uri(.)"/>
        <xsl:variable name="base-path" select="replace($resource-uri, '^file:', '')"/>

        <xsl:result-document href="{$output-folder}{$base-path}index.html" method="xhtml" html-version="5">
            <html lang="en" data-retro="m3" data-theme="light">
                <xsl:call-template name="html-head">
                    <xsl:with-param name="title" select="$resource/dct:title"/>
                    <xsl:with-param name="description" select="$resource/dct:description"/>
                    <xsl:with-param name="doc-path" select="$base-path"/>
                </xsl:call-template>
                <body class="app">
                    <xsl:call-template name="navbar">
                        <xsl:with-param name="brand-href" select="local:relativize('/', $base-path)"/>
                    </xsl:call-template>
                    <div class="docs-layout">
                        <nav class="docs-nav">
                            <ul class="nav nav-list">
                                <xsl:apply-templates
                                    select="$all-docs/rdf:RDF[resolve-uri('../', local:resource-uri(.)) = 'file:/']"
                                    mode="nav">
                                    <xsl:sort select="rdf:Description[rdf:type/@rdf:resource = ('https://www.w3.org/ns/ldt/document-hierarchy#Item', 'https://www.w3.org/ns/ldt/document-hierarchy#Container')]/dct:title"/>
                                    <xsl:with-param name="current-uri" select="$resource-uri" tunnel="yes"/>
                                    <xsl:with-param name="base-path" select="$base-path" tunnel="yes"/>
                                </xsl:apply-templates>
                            </ul>
                        </nav>
                        <main class="docs-main">
                            <xsl:apply-templates select="$resource">
                                <xsl:with-param name="base-path" select="$base-path" tunnel="yes"/>
                            </xsl:apply-templates>
                        </main>
                    </div>
                    <xsl:call-template name="footer"/>
                </body>
            </html>
        </xsl:result-document>
    </xsl:template>

    <!-- ==================== CONTAINER ==================== -->

    <xsl:template match="rdf:Description[rdf:type/@rdf:resource = 'https://www.w3.org/ns/ldt/document-hierarchy#Container']">
        <xsl:param name="base-path" tunnel="yes"/>
        <xsl:variable name="resource-uri" select="local:resource-uri(.)"/>

        <header>
            <h1><xsl:value-of select="dct:title"/></h1>
        </header>
        <xsl:apply-templates select="*[namespace-uri() = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'][starts-with(local-name(), '_')]">
            <xsl:sort select="xs:integer(substring-after(local-name(), '_'))" data-type="number"/>
        </xsl:apply-templates>
        <nav>
            <xsl:apply-templates
                select="$all-docs/rdf:RDF[resolve-uri('../', local:resource-uri(.)) = $resource-uri]"
                mode="child-item">
                <xsl:sort select="rdf:Description[rdf:type/@rdf:resource = ('https://www.w3.org/ns/ldt/document-hierarchy#Item', 'https://www.w3.org/ns/ldt/document-hierarchy#Container')]/dct:title"/>
            </xsl:apply-templates>
        </nav>
    </xsl:template>

    <!-- ==================== ITEM ==================== -->

    <xsl:template match="rdf:Description[rdf:type/@rdf:resource = 'https://www.w3.org/ns/ldt/document-hierarchy#Item']">
        <header>
            <h1><xsl:value-of select="dct:title"/></h1>
        </header>
        <xsl:apply-templates select="*[namespace-uri() = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'][starts-with(local-name(), '_')]">
            <xsl:sort select="xs:integer(substring-after(local-name(), '_'))" data-type="number"/>
        </xsl:apply-templates>
    </xsl:template>

    <!-- ==================== rdf:_N — dereference to target description (or suppress if no @rdf:resource) ==================== -->

    <xsl:template match="rdf:Description/*[namespace-uri() = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'][starts-with(local-name(), '_')]">
        <xsl:if test="@rdf:resource">
            <xsl:apply-templates select="../../rdf:Description[@rdf:about = current()/@rdf:resource]"/>
        </xsl:if>
    </xsl:template>

    <!-- ==================== XHTML CONTENT BLOCK ==================== -->

    <xsl:template match="rdf:Description[rdf:type/@rdf:resource = 'https://w3id.org/atomgraph/linkeddatahub#XHTML']">
        <xsl:apply-templates select="rdf:value/node()" mode="xhtml"/>
    </xsl:template>

    <!-- ==================== OBJECT BLOCK (ldh:ChildrenView etc.) — suppress ==================== -->

    <xsl:template match="rdf:Description[rdf:type/@rdf:resource = 'https://w3id.org/atomgraph/linkeddatahub#Object']"/>

    <!-- object blocks other than the children view get a stub: they only execute in a LinkedDataHub rendering -->
    <xsl:template match="rdf:Description[rdf:type/@rdf:resource = 'https://w3id.org/atomgraph/linkeddatahub#Object'][not(rdf:value/@rdf:resource = 'https://w3id.org/atomgraph/linkeddatahub#ChildrenView')]" priority="1">
        <div class="screenshot-placeholder">
            <span class="msi" aria-hidden="true">bolt</span>
            <p>Interactive block<xsl:if test="dct:title">: <xsl:value-of select="dct:title"/></xsl:if> — executes live in the LinkedDataHub rendering of this page</p>
        </div>
    </xsl:template>

    <!-- ==================== NAV MODE ==================== -->

    <xsl:mode name="nav"/>

    <xsl:template match="/rdf:RDF" mode="nav">
        <xsl:param name="current-uri" tunnel="yes"/>
        <xsl:param name="base-path" tunnel="yes"/>

        <xsl:variable name="resource" select="rdf:Description[rdf:type/@rdf:resource = ('https://www.w3.org/ns/ldt/document-hierarchy#Item', 'https://www.w3.org/ns/ldt/document-hierarchy#Container')]"/>
        <xsl:variable name="resource-uri" select="local:resource-uri(.)"/>
        <xsl:variable name="resource-path" select="replace($resource-uri, '^file:', '')"/>
        <xsl:variable name="children" select="$all-docs/rdf:RDF[resolve-uri('../', local:resource-uri(.)) = $resource-uri]"/>

        <li>
            <xsl:if test="$resource-uri = $current-uri">
                <xsl:attribute name="class">active</xsl:attribute>
            </xsl:if>
            <a href="{local:relativize($resource-path, $base-path)}">
                <xsl:value-of select="$resource/dct:title"/>
            </a>
            <!-- expand only the active trail: children render when the current page is this node or its descendant -->
            <xsl:if test="$children and starts-with($current-uri, $resource-uri)">
                <ul class="nav nav-list">
                    <xsl:apply-templates select="$children" mode="nav">
                        <xsl:sort select="rdf:Description[rdf:type/@rdf:resource = ('https://www.w3.org/ns/ldt/document-hierarchy#Item', 'https://www.w3.org/ns/ldt/document-hierarchy#Container')]/dct:title"/>
                    </xsl:apply-templates>
                </ul>
            </xsl:if>
        </li>
    </xsl:template>

    <!-- ==================== CHILD-ITEM MODE ==================== -->

    <xsl:mode name="child-item"/>

    <xsl:template match="/rdf:RDF" mode="child-item">
        <xsl:param name="base-path" tunnel="yes"/>

        <xsl:variable name="resource" select="rdf:Description[rdf:type/@rdf:resource = ('https://www.w3.org/ns/ldt/document-hierarchy#Item', 'https://www.w3.org/ns/ldt/document-hierarchy#Container')]"/>
        <xsl:variable name="resource-path" select="replace(local:resource-uri(.), '^file:', '')"/>

        <div class="docs-card">
            <h2>
                <a href="{local:relativize($resource-path, $base-path)}">
                    <xsl:if test="$resource/dct:description">
                        <xsl:attribute name="title" select="$resource/dct:description"/>
                    </xsl:if>
                    <xsl:value-of select="$resource/dct:title"/>
                </a>
            </h2>
            <xsl:if test="$resource/dct:description">
                <p><xsl:value-of select="$resource/dct:description"/></p>
            </xsl:if>
        </div>
    </xsl:template>

    <!-- ==================== XHTML MODE ==================== -->

    <xsl:mode name="xhtml" on-no-match="shallow-copy"/>

    <!-- resolve uploads/<hash> to files/<name> in img src and object data -->
    <xsl:template match="xhtml:img/@src[contains(., 'uploads/')] | xhtml:object/@data[contains(., 'uploads/')]" mode="xhtml">
        <xsl:variable name="hash" select="substring-after(., 'uploads/')"/>
        <xsl:variable name="match" select="key('file-by-sha1', $hash, $files-xml)"/>
        <xsl:choose>
            <xsl:when test="$match">
                <xsl:attribute name="{local-name()}" select="substring-before(., 'uploads/') || 'files/' || $match/json:string[@key='name']"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:message terminate="yes">Could not find file for hash '<xsl:value-of select="$hash"/>'</xsl:message>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- strip "LinkedDataHub Cloud" tabs, keep only the active tab content -->
    <xsl:template match="xhtml:div[@class = 'tabbable'][xhtml:ul/xhtml:li/xhtml:a = 'LinkedDataHub Cloud']" mode="xhtml">
        <xsl:apply-templates select="xhtml:div[@class = 'tab-content']/xhtml:div[contains-token(@class, 'active')]/*" mode="xhtml"/>
    </xsl:template>

    <!-- ==================== HTML BOILERPLATE NAMED TEMPLATES ==================== -->

    <xsl:template name="html-head">
        <xsl:param name="title" as="xs:string"/>
        <xsl:param name="description" as="xs:string?"/>
        <xsl:param name="doc-path" as="xs:string?"/>
        <xsl:variable name="css-base" select="local:relativize('/static/css/', ($doc-path, '/')[1])"/>
        <head>
            <title>LinkedDataHub v5 — <xsl:value-of select="$title"/></title>
            <xsl:if test="$description">
                <meta name="description" content="{$description}"/>
            </xsl:if>
            <xsl:variable name="modified" select="key('timestamp-by-path', $doc-path, $timestamps-xml)"/>
            <xsl:if test="$modified">
                <meta name="last-modified" content="{$modified}"/>
            </xsl:if>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <!-- LinkedDataHub design system: fonts, tokens, components, m3 skin, legacy-primitive bridge — then the docs skin -->
            <link href="{$css-base}fonts.css" rel="stylesheet" type="text/css"/>
            <link href="{$css-base}colors_and_type.css" rel="stylesheet" type="text/css"/>
            <link href="{$css-base}app.css" rel="stylesheet" type="text/css"/>
            <link href="{$css-base}retro.css" rel="stylesheet" type="text/css"/>
            <link href="{$css-base}ldh-bridge.css" rel="stylesheet" type="text/css"/>
            <link href="{$css-base}docs.css" rel="stylesheet" type="text/css"/>
            <script type="text/javascript">
                <xsl:text><![CDATA[
                    document.addEventListener("click", function(event) {
                        var link = event.target.closest("ul.nav-tabs a");
                        if (!link) return;
                        var li = link.closest("li"), ul = li.parentElement, content = ul.nextElementSibling;
                        var index = Array.prototype.indexOf.call(ul.children, li);
                        Array.prototype.forEach.call(ul.children, function(tab) { tab.classList.remove("active"); });
                        li.classList.add("active");
                        Array.prototype.forEach.call(content.children, function(pane, i) { pane.classList.toggle("active", i === index); });
                    });
                ]]></xsl:text>
            </script>
            <script async="async" defer="defer" src="https://buttons.github.io/buttons.js"/>
            <script async="async" defer="defer" src="https://platform.twitter.com/widgets.js"/>
            <script async="async" src="https://www.googletagmanager.com/gtag/js?id=UA-38402002-6"/>
            <script>
                <xsl:text><![CDATA[
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', 'UA-38402002-6');
                ]]></xsl:text>
            </script>
        </head>
    </xsl:template>

    <xsl:template name="navbar">
        <xsl:param name="brand-href" as="xs:string"/>
        <div class="navbar ldh-header">
            <a class="brand ldh-wordmark" href="{$brand-href}">
                <span class="mark"></span>
                <span>LinkedDataHub</span>
            </a>
            <div/> <!-- keep the header grid columns aligned -->
            <div class="ldh-header-actions">
                <details class="docs-versions">
                    <summary>Documentation v5</summary>
                    <div>
                        <a href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/v3/">Documentation v3</a>
                        <a href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/v2/">Documentation v2</a>
                    </div>
                </details>
                <a href="https://github.com/AtomGraph/LinkedDataHub-Apps" target="_blank">Sample applications</a>
                <a class="github-button" href="https://github.com/AtomGraph/LinkedDataHub/subscription" data-icon="octicon-eye" data-size="large" aria-label="Watch AtomGraph/LinkedDataHub on GitHub">Watch</a>
                <a class="github-button" href="https://github.com/AtomGraph/LinkedDataHub" data-icon="octicon-star" data-size="large" data-show-count="true" aria-label="Star AtomGraph/LinkedDataHub on GitHub">Star</a>
                <a href="https://twitter.com/atomgraphhq" class="twitter-follow-button" data-show-count="false">Follow @atomgraphhq</a>
                <a href="https://youtube.com/@atomgraph" target="_blank">
                    <span class="msi outline" aria-hidden="true">smart_display</span>
                    <xsl:text> @atomgraph</xsl:text>
                </a>
            </div>
        </div>
    </xsl:template>

    <xsl:template name="footer">
        <div class="footer ldh-footer">
            <div class="cols">
                <div class="col brand-col">
                    <a class="ldh-wordmark" href="https://linkeddatahub.com" target="_blank">
                        <span class="mark"></span>
                        <span>LinkedDataHub</span>
                    </a>
                    <p>The low-code Knowledge Graph application platform. Built on RDF, SPARQL and Linked Data principles.</p>
                </div>
                <div class="col">
                    <p class="ftitle">About</p>
                    <a href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/about/" target="_blank">LinkedDataHub</a>
                    <a href="https://atomgraph.com" target="_blank">AtomGraph</a>
                </div>
                <div class="col">
                    <p class="ftitle">Resources</p>
                    <a href="https://atomgraph.github.io/LinkedDataHub/linkeddatahub/docs/" target="_blank">Documentation</a>
                    <a href="https://www.youtube.com/channel/UCtrdvnVjM99u9hrjESwfCeg" target="_blank">Screencasts</a>
                </div>
                <div class="col">
                    <p class="ftitle">Support</p>
                    <a href="https://groups.io/g/linkeddatahub" target="_blank">Mailing list</a>
                    <a href="https://github.com/AtomGraph/LinkedDataHub/issues" target="_blank">Report issues</a>
                    <a href="mailto:support@linkeddatahub.com">Contact support</a>
                </div>
                <div class="col">
                    <p class="ftitle">Follow us</p>
                    <a href="https://twitter.com/atomgraphhq" target="_blank">@atomgraphhq</a>
                    <a href="https://github.com/AtomGraph" target="_blank">github.com/AtomGraph</a>
                </div>
            </div>
            <div class="legal">
                <span>© <xsl:value-of select="format-date(current-date(), '[Y]')"/> AtomGraph · LinkedDataHub</span>
            </div>
        </div>
    </xsl:template>

    <!-- ==================== HELPER FUNCTIONS ==================== -->

    <!-- make $target path relative to $base path (both root-relative, e.g. /get-started/) -->
    <xsl:function name="local:relativize" as="xs:string">
        <xsl:param name="target" as="xs:string"/>
        <xsl:param name="base" as="xs:string"/>
        <xsl:sequence select="local:relativize-segs(tail(tokenize($target, '/')), tail(tokenize($base, '/')))"/>
    </xsl:function>

    <xsl:function name="local:relativize-segs" as="xs:string">
        <xsl:param name="t" as="xs:string*"/>
        <xsl:param name="b" as="xs:string*"/>
        <xsl:choose>
            <xsl:when test="exists($t) and exists($b) and head($t) = head($b)">
                <xsl:sequence select="local:relativize-segs(tail($t), tail($b))"/>
            </xsl:when>
            <xsl:otherwise>
                <!-- for each remaining base segment (except first), go up one level; then append target -->
                <xsl:sequence select="string-join((for $s in tail($b) return '..', $t), '/')"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>

</xsl:stylesheet>
