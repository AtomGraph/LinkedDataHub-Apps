# overview F3 — "Access control uses W3C ACL authorizations, which are RDF too. Here the CLI creates an
# Editors group, lets it write the user guide, and makes the dataspace public."
#
# Three admin commands against the running stack: an agent group with the owner as its member, an
# authorization granting that group read and write on the user guide, and make-public. The group
# and the authorization are removed off camera before the take, and the public-read authorization
# reset, so every command has something to do.
#
# The CLI's credentials arrive in the environment (LDH_CERT_FILE, LDH_CERT_PASSWORD), as do the
# dataspace (LDH_BASE), its administration dataspace (LDH_ADMIN_BASE) and the owner's WebID
# (WEBID): the group and authorization commands take the administration base URI as their
# positional, make-public defaults to LDH_BASE. Geometry, framerate and typing speed come from
# lib/terminal.mjs, which prepends them.

Require ldh

Hide
Type "clear" Enter
Sleep 1s
Show

Sleep 1s
Type `ldh admin create group --name Editors --slug editors --uri '#this' --member "$WEBID" $LDH_ADMIN_BASE` Enter
Sleep 4s
Type `ldh admin create authorization --label "Editors write the user guide" --slug editors-user-guide --agent-group ${LDH_ADMIN_BASE}acl/groups/editors/#this --to ${LDH_BASE}user-guide/ --read --write $LDH_ADMIN_BASE` Enter
Sleep 4s
Type "ldh admin make-public" Enter
Sleep 6s
