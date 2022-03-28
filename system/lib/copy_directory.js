// Copyright 2021 The Emscripten Authors.  All rights reserved.
// Emscripten is available under two separate licenses, the MIT license and the
// University of Illinois/NCSA Open Source License.  Both these licenses can be
// found in the LICENSE file.

const fs = require('fs')
const path = require('path')

/*
 * Copy a directory recursively, from `src` to `dest`.
 * If `dest` exists, it will be removed before `src` is copied to `dest`.
 * For any symlinks in `src`, the corresponding linked files will be copied to `dest`.
 * This function can be seen as the equivalent of
 * `shutil.copytree(src, dest, dirs_exist_ok=False).
 * @param {string} src - the source directory
 * @param {string} src - the destination directory
 * @returns {void}
 */
function copyDirSync(src, dest) {
    if (fs.existsSync(dest))
        fs.rmSync(dest, {recursive: true, force: true})
    fs.mkdirSync(dest)

    for (const filename of fs.readdirSync(src)) {
        const srcPath  = path.join(src,  filename)
        const destPath = path.join(dest, filename)
        const stat = fs.statSync(srcPath)
        if (stat.isDirectory())
            copyDirSync(srcPath, destPath)
        else
            fs.copyFileSync(srcPath, destPath)
    }
}

module.exports = { copyDirSync }
