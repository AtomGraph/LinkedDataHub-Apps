# overview F3 — "One command makes a dataspace public."
#
# `ldh admin make-public` writes the authorization that lets anyone read the dataspace's
# documents. Run for real: the dataspace's public-read authorization was removed off
# camera, so an anonymous visitor was refused before this and is admitted after it.
#
# The dataspace is LDH_BASE; the CLI's credentials arrive in the environment. Geometry,
# framerate and typing speed come from lib/terminal.mjs, which prepends them.

Require ldh

Hide
Type "clear" Enter
Sleep 1s
Show

Sleep 1s
Type "ldh admin make-public" Enter
Sleep 8s
