// Starts a test dev server on port 3100 with its own build folder (.next-test)
// and its own database, so it never interferes with the main dev server or your
// interview history.
const os = require('node:os');
const path = require('node:path');
process.env.NEXT_DIST_DIR = '.next-test';
process.env.DATABASE_PATH = path.join(os.tmpdir(), 'interview-test', 'interviews.sqlite');
process.argv = [process.argv[0], 'next', 'dev', '--hostname', '127.0.0.1', '--port', '3100'];
require('../node_modules/next/dist/bin/next');
