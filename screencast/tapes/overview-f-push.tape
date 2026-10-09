# overview F1 — "Push a folder of Turtle files, and the dataspace is live."
#
# The documentation app pushed into an emptied dataspace: `ldh push` PUTs every RDF file to
# the document its path spells and uploads every other file into its folder's document,
# printing one URL per line. Run for real against the running stack; the dataspace was
# emptied off camera so that what comes alive on screen was not there before.
#
# The working directory is the app (LDH_CLIP_DIR), the dataspace is LDH_BASE, and the CLI's
# credentials arrive in the environment (LDH_CERT_FILE, LDH_CERT_PASSWORD), the way the
# Makefile hands them to every ldh call — so the command typed is the one a person types.
# Geometry, framerate and typing speed come from lib/terminal.mjs, which prepends them.

Require ldh

Hide
Type "cd $LDH_CLIP_DIR && clear" Enter
Sleep 1s
Show

Sleep 1s
Type "ls" Enter
Sleep 3s

Type `ldh push --dir . "$LDH_BASE"` Enter
# the push itself: measured at about twenty seconds for the docs app's 59 documents and
# 44 uploads, and the streaming URLs are not frozen, so this plays at 1x
Sleep 40s
