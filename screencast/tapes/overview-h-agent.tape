# overview H5–H6 — "Outside the browser, an agent connects over MCP to the same operations,
# through Web-Algebra." / "It is asked for something it has to declare rather than code …"
#
# Claude Code registers Web-Algebra as an MCP server with the command docs/get-started/agents.ttl
# gives, run from the LinkedDataHub deployment's directory (TAKE_DIR) so the certificate paths in
# it resolve; `/mcp` lists it connected; then the docs page's prompt, aimed at the Northwind
# dataspace, and the agent's tool calls going by.
#
# Off camera, set up by scenes/overview-h-agent.mjs through the environment:
#   TAKE_WHEELS    a find-links directory holding the Web-Algebra wheel the take runs, so the
#                  docs' `uv run --with web-algebra` resolves to it rather than to PyPI
#   TAKE_SETTINGS  a settings file for this session only: the web-algebra tools allowed, Bash,
#                  Write and Edit denied (so no permission prompt can stall the take), and the
#                  Figma plugin off; with ENABLE_CLAUDEAI_MCP_SERVERS=false, `/mcp` then lists
#                  web-algebra alone
# The MCP server is removed again after the take, off camera.

Require claude
Require uv

Hide
Type `cd "$TAKE_DIR" && export UV_FIND_LINKS="$TAKE_WHEELS" ENABLE_CLAUDEAI_MCP_SERVERS=false && alias claude='claude --settings "$TAKE_SETTINGS"' && export PS1='$ ' && clear` Enter
Sleep 1s
Show

Sleep 1s
Type `claude mcp add web-algebra --env CERT_PEM_PATH="$PWD/ssl/owner/cert.pem" --env CERT_PASSWORD="$(cat secrets/owner_cert_password.txt)" -- uv run --with web-algebra python -m web_algebra` Enter
Sleep 3s

Type "claude" Enter
Sleep 8s
# a folder Claude Code has not been trusted in asks first; Enter accepts, and is harmless otherwise
Enter
Sleep 3s

Type "/mcp" Enter
Sleep 5s
Escape
Sleep 2s

Type "Create a container for books in my dataspace https://northwind-traders.demo.localhost/, add three books with authors, and add a chart of books per author."
Sleep 1s
Enter
Sleep 110s

Hide
Type "/exit" Enter
Sleep 3s
Type "claude mcp remove web-algebra -s local" Enter
Sleep 4s
