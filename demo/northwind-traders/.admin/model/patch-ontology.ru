PREFIX foaf: <http://xmlns.com/foaf/0.1/>

DELETE {
  ?s ?p ?o
}
WHERE {
  ?s ?p ?o
  # Exclude triples about the main resource itself
  MINUS {
    <> ?p ?o
    BIND(<> AS ?s)
  }
  # Exclude triples about the foaf:primaryTopic resource
  MINUS {
    <> foaf:primaryTopic ?primaryTopic .
    ?primaryTopic ?p ?o
    BIND(?primaryTopic AS ?s)
  }
}
