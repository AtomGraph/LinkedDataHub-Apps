find . -name '*.ttl' -type f -exec echo {} \; -exec trig --validate {} \;

# riot checks rdf:XMLLiteral well-formedness; canonical form is only enforced
# up to Jena 4.7.0, so it is checked separately
"$(dirname "$0")"/../check-xmlliterals.sh "$(dirname "$0")"
