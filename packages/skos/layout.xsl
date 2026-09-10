<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xsl:stylesheet [
    <!ENTITY ldh    "https://w3id.org/atomgraph/linkeddatahub#">
    <!ENTITY ac     "https://w3id.org/atomgraph/client#">
    <!ENTITY rdf    "http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <!ENTITY rdfs   "http://www.w3.org/2000/01/rdf-schema#">
    <!ENTITY xsd    "http://www.w3.org/2001/XMLSchema#">
    <!ENTITY skos   "http://www.w3.org/2004/02/skos/core#">
    <!ENTITY srx    "http://www.w3.org/2005/sparql-results#">
    <!ENTITY foaf   "http://xmlns.com/foaf/0.1/">
]>
<xsl:stylesheet version="3.0"
xmlns="http://www.w3.org/1999/xhtml"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns:xhtml="http://www.w3.org/1999/xhtml"
xmlns:xs="http://www.w3.org/2001/XMLSchema"
xmlns:ldh="&ldh;"
xmlns:ac="&ac;"
xmlns:rdf="&rdf;"
xmlns:rdfs="&rdfs;"
xmlns:xsd="&xsd;"
xmlns:skos="&skos;"
xmlns:srx="&srx;"
xmlns:foaf="&foaf;"
exclude-result-prefixes="#all">

    <xsl:param name="ldh:base" as="xs:anyURI" static="yes"/>

    <xsl:import _href="{resolve-uri('static/com/atomgraph/linkeddatahub/xsl/layout.xsl', $ldh:base)}"/>

    <xsl:param name="foaf:Agent" as="document-node()?"/>

    <!-- no stylesheet override: the package rides the design system the system layout links.
         The theme injected here was a Bootstrap sheet under the application's static path, which
         no longer exists and would have layered a second design system over the kits -->

    <!-- the hierarchy predicates render as the concept tree, not as statement rows -->
    <xsl:template match="skos:narrower | skos:broader | skos:related | skos:member" mode="ac:PropertyEditor"/>

</xsl:stylesheet>
