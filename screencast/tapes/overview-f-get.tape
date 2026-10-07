# overview F3b — "Every document has both an HTML and an RDF representation. Ask the home page for
# Turtle, and you get Turtle."
#
# The home page the push just made public, asked for as Turtle with ldh get. LDH_BASE names the
# dataspace and the CLI's credentials arrive in the environment. Geometry, framerate and typing
# speed come from lib/terminal.mjs, which prepends them.

Require ldh

Hide
Type "clear" Enter
Sleep 1s
Show

Sleep 1s
Type "ldh get --accept text/turtle $LDH_BASE" Enter
Sleep 7s
