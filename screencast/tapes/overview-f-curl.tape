# overview F3b — "And the same document answers in RDF to anyone who asks for it."
#
# One request with Accept: text/turtle on the home page of the site just made public, and
# the Turtle it answers with. No certificate: the point is that anyone can ask. The home
# page, because its description is twenty short lines — a content page's is one long
# XMLLiteral, which fills the screen with escaped XHTML.
#
# LDH_BASE is the dataspace. Geometry, framerate and typing speed come from
# lib/terminal.mjs, which prepends them.

Require curl

Hide
Type "clear" Enter
Sleep 1s
Show

Sleep 1s
Type "curl -s -H 'Accept: text/turtle' ${LDH_BASE}" Enter
Sleep 7s
