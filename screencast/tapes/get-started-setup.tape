# get-started/setup — "setting up LinkedDataHub with Docker"
#
# The procedure on docs/get-started/setup.ttl, run for real: clone, write .env, generate
# the server certificate, create the three password secrets, bring the stack up. The
# recording runs until the containers are up and the log is streaming.
#
# Nothing is staged. RULES.md: a recording is a claim about what using the product is
# like, so a step the audience could not reproduce is a false claim even when the pixels
# look right. The image build is not skipped — render/pace.mjs compresses the stretches
# that are genuinely frozen, and the scrolling build output, which is not frozen, plays
# at 1x because that is how long it takes.
#
# One value differs from the block the page prints, and it is deliberate:
#
#   COMPOSE_PROJECT_NAME  Compose identifies a project by name, not by directory, so
#                         reusing the name of a stack already on this machine would make
#                         it adopt and recreate those containers — and a later `down -v`
#                         would take their named volumes with it.
#
# The ports are the page's own defaults and must stay that way: config/dataspaces.trig
# hardcodes https://localhost:4443 and https://admin.localhost:4443, so an instance
# brought up on any other port exits at startup with
#
#   Root end-user app with origin <https://localhost:PORT> not found. Exiting...
#
# The page's advice to pick different ports when 81/4443 are taken does not work today.
#
# The clone takes --branch develop, and the .env block is the page's: both are 6.0.
# ABS_PATH is gone from that block because a dataspace serves from the root of its origin
# and there was never a second working value. master is still 5.10.0, which cannot run
# without it — its docker-compose.yml passes ABS_PATH=${ABS_PATH}, which resolves to the
# empty string and overrides the Dockerfile's ENV ABS_PATH=/, so its entrypoint bails on
# [ -z "$ABS_PATH" ]. The page's step 1 is prose — fork the repository and clone the fork
# — so it prints no command the branch flag contradicts. Drop the flag once 6.0 is what a
# clone gets.
#
# Geometry, framerate and typing speed come from lib/terminal.mjs, which prepends them.
# The working directory arrives as $LDH_CLIP_DIR.

Require git
Require make
Require docker

# Off camera, the way lib/fixture.mjs resets a fixture before the browser context exists:
# be in the work directory with a clean screen before the recording proper starts.
Hide
Type "cd $LDH_CLIP_DIR && clear" Enter
Sleep 2s
Show

Sleep 1s
Type "git clone --branch develop https://github.com/AtomGraph/LinkedDataHub.git" Enter
Sleep 25s

Type "cd LinkedDataHub" Enter
Sleep 2s

Type "cp .env_sample .env" Enter
Sleep 2s

Type "cat > .env <<'EOF'" Enter
Type "COMPOSE_CONVERT_WINDOWS_PATHS=1" Enter
Type "COMPOSE_PROJECT_NAME=ldh-setup-clip" Enter
Type "PROTOCOL=https" Enter
Type "HTTP_PORT=81" Enter
Type "HTTPS_PORT=4443" Enter
Type "HOST=localhost" Enter
Type "OWNER_MBOX=john@doe.com" Enter
Type "OWNER_GIVEN_NAME=John" Enter
Type "OWNER_FAMILY_NAME=Doe" Enter
Type "OWNER_ORG_UNIT=My unit" Enter
Type "OWNER_ORGANIZATION=My org" Enter
Type "OWNER_LOCALITY=Copenhagen" Enter
Type "OWNER_STATE_OR_PROVINCE=Denmark" Enter
Type "OWNER_COUNTRY_NAME=DK" Enter
Type "EOF" Enter
Sleep 3s

Type "./bin/server-cert-gen.sh .env nginx ssl" Enter
Sleep 10s

Type "mkdir -p secrets" Enter
Sleep 1s
Type "printf '%s' 'Password' > secrets/owner_cert_password.txt" Enter
Sleep 1s
Type "printf '%s' 'Password' > secrets/secretary_cert_password.txt" Enter
Sleep 1s
Type "printf '%s' 'Password' > secrets/client_truststore_password.txt" Enter
Sleep 3s

Type "make up -- --build" Enter
# The build, then the containers starting. Sized from a measured run: VHS 0.12 has no
# conditional wait, so this is a fixed hold that has to outlast both, and the streaming
# log that follows is not frozen, so every second of overrun lands in the clip at 1x.
Sleep 240s
