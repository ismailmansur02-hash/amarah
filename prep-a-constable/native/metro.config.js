// ============================================================================
// metro.config.js
//
// The native app imports content and logic from ../shared, which lives OUTSIDE
// this project folder. Metro only watches its own root by default, so without
// the watchFolders entry below every `../shared/...` import fails to resolve.
//
// nodeModulesPaths is pinned to this folder's node_modules so Metro does not
// walk up and pick React out of preview/node_modules (a different copy), which
// would produce two Reacts in one bundle.
// ============================================================================

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '..', 'shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
