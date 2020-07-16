# LinkedDataHub applications

System, demo, and user-submitted applications built on LinkedDataHub. Completely data-driven, no code involved (besides the shell scripts).

## Prerequisites

The installation scripts in this repository use [LinkedDataHub's CLI scripts](https://linkeddatahub.com/linkeddatahub/docs/reference/command-line-interface/). You need to set `SCRIPT_ROOT` environmental variable to the [`scripts` subfolder](https://github.com/AtomGraph/LinkedDataHub/tree/master/scripts) of your LinkedDataHub fork or clone, for example:

    export SCRIPT_ROOT=/c/Users/namedgraph/WebRoot/AtomGraph/LinkedDataHub/scripts

## Apps

### Documentation

**The documentation of LinkedDataHub open-source and Cloud versions.**

<dl>
    <dt>Source</dt>
    <dd><a href="../../tree/master/linkeddatahub/docs/">linkeddatahub/docs/</a></dd>
    <dt>Live instance</dt>
    <dd><a href="https://linkeddatahub.com/linkeddatahub/docs/">https://linkeddatahub.com/linkeddatahub/docs/</a></dd>
    <dt>Lines of code</dt>
    <dd>0 lines of imperative code</dd>
    <dd>164 lines of installation shell scripts</dd>
</dl>

### City Graph

![City Graph geospatial view](../../raw/master/demo/city-graph/screenshot.png "City Graph geospatial view")

**Browser of Copenhagen's geospatial open data, imported from [Open Data København](https://data.kk.dk/). Provides a type-colored geospatial overview. Geo resources provide a view with neighbouring resources included.**

<dl>
    <dt>Source</dt>
    <dd><a href="../../tree/master/demo/city-graph/">demo/city-graph/</a></dd>
    <dt>Live instance</dt>
    <dd><a href="https://linkeddatahub.com/demo/city-graph/">https://linkeddatahub.com/demo/city-graph/</a></dd>
    <dt>Features</dt>
    <dd>RDF <a href="../../blob/master/demo/city-graph/import-csv.sh">import from CSV</a></dd>
    <dd><a href="../../blob/master/demo/city-graph/admin/sitemap/create-templates.sh">item template</a> with a <a href="../../blob/master/demo/city-graph/admin/sitemap/queries/describe-place.rq">query</a> that describes not only the requested resource, but also other resources with coordinates in a bounding box around it</dd>
    <dt>Lines of code</dt>
    <dd>0 lines of imperative code</dd>
    <dd>479 lines of SPARQL</dd>
    <dd>342 lines of installation shell scripts</dd>
</dl>

### Life sciences

![Life sciences ChEMBL chart](../../raw/master/demo/life-sciences/screenshot.png "Life sciences ChEMBL chart")

**Browser over a collection of molecules as well as a bar chart rendered from a SPARQL result.**

<dl>
    <dt>Source</dt>
    <dd><a href="../../tree/master/demo/life-sciences/">demo/life-sciences/</a></dd>
    <dt>Live instance</dt>
    <dd><a href="https://linkeddatahub.com/demo/life-sciences/">https://linkeddatahub.com/demo/life-sciences/</a></dd>
    <dt>Features</dt>
    <dd><a href="../../blob/master/demo/life-sciences/create-charts.sh">chart</a></dd>
    <dt>Lines of code</dt>
    <dd>0 lines of imperative code</dd>
    <dd>37 lines of SPARQL</dd>
    <dd>153 lines of installation shell scripts</dd>
</dl>

### SKOS

![SKOS editor view](../../raw/master/demo/skos/screenshot.png "SKOS editor view")

**Basic SKOS editor. Concepts and concept schemas can be created, edited, and linked with each other. Ontology types have separate URI templates; required instance properties are validated using constraints.**

<dl>
    <dt>Source</dt>
    <dd><a href="../../tree/master/demo/skos/">demo/skos/</a></dd>
    <dt>Live instance</dt>
    <dd><a href="https://linkeddatahub.com/demo/skos/">https://linkeddatahub.com/demo/skos/</a></dd>
    <dt>Features</dt>
    <dd><a href="../../blob/master/demo/skos/admin/model/create-classes.sh">classes</a></dd>
    <dd><a href="../../blob/master/demo/skos/admin/model/create-constructors.sh">constructors</a></dd>
    <dd><a href="../../blob/master/demo/skos/admin/model/create-constraints.sh">constraints</a></dd>
    <dd><a href="../../blob/master/demo/skos/admin/model/create-restrictions.sh">restrictions</a></dd>
    <dt>Lines of code</dt>
    <dd>0 lines of imperative code</dd>
    <dd>44 lines of SPARQL</dd>
    <dd>324 lines of installation shell scripts</dd>
</dl>

__You need to request append/write access to be able to create/edit the data.__