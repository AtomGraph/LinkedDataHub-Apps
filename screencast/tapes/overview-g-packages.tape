# overview G2 — "Installing one takes a single triple, written here from the command line."
#
# The catalogue listed, then the taxonomy editor package added to the thesaurus dataspace.
# Both commands are the real ones against the running stack: the package is removed off
# camera before the take, so `list` shows it as available and `add` genuinely installs it.
#
# The CLI's credentials arrive in the environment (LDH_CERT_FILE, LDH_CERT_PASSWORD), the
# way the Makefile hands them to every ldh call, so the commands typed are the ones a
# person would type. LDH_BASE names the dataspace, the
# default of the base URI the packages commands take as their positional. Geometry, framerate and typing speed come
# from lib/terminal.mjs, which prepends them.

Require ldh

Hide
Type "clear" Enter
Sleep 1s
Show

Sleep 1s
Type "ldh packages list" Enter
Sleep 6s

Type "ldh packages add --package https://packages.linkeddatahub.com/editor/taxonomy/#this" Enter
Sleep 6s

Type "ldh packages list" Enter
Sleep 6s
