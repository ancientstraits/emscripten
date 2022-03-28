#!/usr/bin/env node
// Copyright 2021 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

// Copy local llvm library changes into the upstream llvm tree.
// This is the logical inverse of update_compiler_rt.py, update_libcxx.py
// and update_libcxxabi.py which copy changes form the upstream llvm 
// into emscripten.

'use strict';

const fs = require('fs');
const path = require('path')
const { copyDirSync } = require('./copy_directory')

const scriptDir = __dirname
const emscriptenRoot = path.join(scriptDir, '../..')
const defaultLLVMDir = path.join(emscriptenRoot, '../llvm-project')
const copyDirs = [
    'compiler-rt',
    'libcxx',
    'libcxxabi',
]


const upstreamRoot = process.argv.length > 1 ?
    path.normalize(process.argv[1]) : defaultLLVMDir

if (!fs.existsSync(upstreamRoot)) {
    console.log(`llvm tree not found: ${upstreamRoot}`)
    process.exit(1)
}

for (const dir of copyDirs) {
    const joinedDir = path.join(upstreamRoot, dir)
    if (!fs.existsSync(joinedDir)) {
        console.log(`${joinedDir} not found`)
        process.exit(1)
    }
}

for (const dir of copyDirs) {
    const localDir = path.join(scriptDir, dir)
    const upstreamDir = path.join(upstreamRoot, dir)
    print(`copying ${localDir} -> ${upstreamDir}`)
    copyDirSync(localDir, upstreamDir)
}
