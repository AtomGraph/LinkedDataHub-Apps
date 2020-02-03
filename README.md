# LinkedDataHub applications

System, demo, and user-submitted applications built on LinkedDataHub. Completely data-driven, no code involved (besides the shell scripts).


## Documentation

## City Graph

![City Graph geospatial view](../../raw/master/demo/city-graph/screenshot.png "City Graph geospatial view")

<dl>
    <dt>Source</dt>
    <dd><a href="../../tree/master/demo/city-graph/">demo/city-graph/</a></dd>
    <dt>Live instance</dt>
    <dd><a href="https://linkeddatahub.com/demo/city-graph/">https://linkeddatahub.com/demo/city-graph/</a></dd>
    <dt>Lines of code</dt>
    <dd>0 lines of imperative code</dd>
    <dd>479 lines of SPARQL</dd>
    <dd>342 lines of installation shell scripts</dd>
</dl>

Browser of Copenhagen's geospatial open data, imported from [Open Data København](https://data.kk.dk/). Provides a type-colored geospatial overview. Geo resources provide a view with neighbouring resources included.

Features:
* RDF [import from CSV](../../blob/master/demo/city-graph/import-csv.sh)
* [item template](../../blob/master/demo/city-graph/admin/sitemap/create-templates.sh)
    * [query](../../blob/master/demo/city-graph/admin/sitemap/queries/describe-place.rq) describes not only the requested resource, but also other resources with coordinates in a bounding box around it

## Life sciences

![Life sciences ChEMBL chart](../../raw/master/demo/life-sciences/screenshot.png "Life sciences ChEMBL chart")

Browser over a collection of molecules as well as a bar chart rendered from a SPARQL result.

<dl>
    <dt>Source</dt>
    <dd><a href="../../tree/master/demo/life-sciences/">demo/life-sciences/</a></dd>
    <dt>Live instance</dt>
    <dd><a href="https://linkeddatahub.com/demo/life-sciences/">https://linkeddatahub.com/demo/life-sciences/</a></dd>
    <dd>0 lines of imperative code</dd>
    <dd>37 lines of SPARQL</dd>
    <dd>153 lines of installation shell scripts</dd>
</dl>

Features:
* [chart](../../blob/master/demo/life-sciences/create-charts.sh)

## SKOS

![SKOS editor view](../../raw/master/demo/skos/screenshot.png "SKOS editor view")

<dl>
    <dt>Source</dt>
    <dd><a href="../../tree/master/demo/skos/">demo/skos/</a></dd>
    <dt>Live instance</dt>
    <dd><a href="https://linkeddatahub.com/demo/skos/">https://linkeddatahub.com/demo/skos/</a></dd>
    <dd>0 lines of imperative code</dd>
    <dd>44 lines of SPARQL</dd>
    <dd>324 lines of installation shell scripts</dd>
</dl>

Basic SKOS editor. Concepts and concept schemas can be created, edited, and linked with each other. Ontology types have separate URI templates; required instance properties are validated using constraints.

Features:
* domain [classes](../../blob/master/demo/skos/admin/model/create-classes.sh) with
    * [constructors](../../blob/master/demo/skos/admin/model/create-constructors.sh)
    * [constraints](../../blob/master/demo/skos/admin/model/create-constraints.sh)
    * [restrictions](../../blob/master/demo/skos/admin/model/create-restrictions.sh)

**You need to request append/write access to be able to create/edit the data.**