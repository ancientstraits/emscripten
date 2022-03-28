#!/usr/bin/env node
// Copyright 2021 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// Copy local emscripten changes into the upstream musl tree.
// This is the logical inverse of update_musl.py which copies changes
// form the upstream musl tree into emscripten.

'use strict';

const fs = require('fs')
const path = require('path')
const { copyDirSync } = require('./copy_directory')

const scriptDir = __dirname
const localDir = path.join(scriptDir, 'libc/musl')
const emscriptenRoot = path.join(scriptDir, '../..')
const defaultMuslDir = path.join(emscriptenRoot, '../musl')


const upstreamRoot = process.argv.length > 1 ?
    path.resolve(process.argv[1]) : defaultMuslDir

if (!fs.existsSync(upstreamRoot)) {
    console.log(`musl tree not found: ${upstreamRoot}`)
    process.exit(1)
}

console.log(`copying ${localDir} -> ${upstreamRoot}`)
copyDirSync(localDir, upstreamRoot)
