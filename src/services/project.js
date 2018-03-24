import { getLogger } from 'log4js';

import {
  findProject,
  findProjectNames,
  insertProject,
  removeProject,
  updateProjectVersions
} from '../persistence/project';
import { initDb } from '../persistence/db';
import { getRepoVersions } from '../api/github';

const logger = getLogger('Project Service');

export const initProjectData = async (name, repo, urlType, url, hashtags) => {
  try {
    await initDb();
    logger.info('Init project data', name, repo, urlType, url, hashtags);
    const versions = await getRepoVersions(repo);
    versions.shift(); // remove latest version to trigger first release
    if (versions.length) {
      await insertProject(name, repo, urlType, url, hashtags, versions);
    } else {
      logger.warn('No versions found');
    }
    logger.info('Project data initialized', name, versions.length, 'versions');
  } catch (err) {
    logger.error('Project data initialization failed', err);
  }
  process.exit(0);
};

export const removeAllProjectData = async () => {
  try {
    await initDb();
    logger.warn('Remove all project data');
    const names = await findProjectNames();
    for (let name of names) {
      logger.warn('Removing project data', name);
      await removeProject(name);
    }
    logger.warn('Removed all project data', names.join(', '));
  } catch (err) {
    logger.error('Remove all project data failed', err);
  }
  process.exit(0);
};

export const removeProjectLastVersion = async projectName => {
  try {
    await initDb();
    logger.warn('Remove project last version: ', projectName);
    const project = await findProject(projectName);
    const [removedVersion, ...versions] = project.versions;
    await updateProjectVersions(projectName, versions);
    logger.warn('Remove project last version: ', removedVersion);
  } catch (err) {
    logger.error('Remove project last versio failed', err);
  }
  process.exit(0);
};
