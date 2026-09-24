// ============================================================================
// metro.config.js
//
// The native app imports content and logic from ../shared, which lives OUTSIDE
// this project folder. Metro only watches its own root by default, so without
// the watchFolders entry below every `../shared/...` import fails to resolve.
//
// nodeModulesPaths pins dependency resolution to this folder, which matters
// because files under ../shared sit outside the project root.
//
// An earlier version also set resolver.disableHierarchicalLookup, to stop
// Metro finding a second React in preview/node_modules. That was unnecessary:
// hierarchical lookup only walks UP from the importing file, and preview/ is a
// SIBLING of native/, never an ancestor — verified that no ancestor directory
// contains node_modules/react at all. It also tripped expo-doctor, so it is
// gone.
// ============================================================================

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '..', 'shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
