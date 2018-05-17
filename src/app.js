import 'now-env';
import yargs from 'yargs';
import express from 'express';
import { configure, getLogger } from 'log4js';

import { removeAllTweets } from './services/twitter';
import { runReleaseWatcher } from './services/release';
import {
  initProjectData,
  removeAllProjectData,
  removeProjectLastVersion
} from './services/project';
import { getChangelogAsImage } from './services/changelog';
import { getChangelogImage } from './handlers/changelog';

const logger = getLogger('App');

const configureLogger = debug =>
  configure({
    appenders: {
      out: {
        type: 'stdout',
        layout: { type: 'pattern', pattern: '%[[%p] %c - %]%m' }
      }
    },
    categories: {
      default: { appenders: ['out'], level: debug ? 'debug' : 'info' }
    }
  });

const argv = yargs
  .command(
    'remove',
    'Removes application data',
    {
      twitter: {
        type: 'boolean',
        description: 'Removes all tweets from user timeline'
      },
      database: {
        type: 'boolean',
        description: 'Removes all project data from database'
      },
      project: {
        type: 'string',
        description: 'Removes last version of a project'
      }
    },
    async ({ twitter, database, project, debug }) => {
      configureLogger(debug);
      if (twitter) {
        await removeAllTweets();
      }
      if (database) {
        await removeAllProjectData();
      }
      if (project) {
        await removeProjectLastVersion(project);
      }
    }
  )
  .command(
    'init',
    'Adds project and initial versions to the database',
    {
      name: {
        type: 'string',
        description: 'Project name, eg: Angular',
        demandOption: true
      },
      repo: {
        type: 'string',
        description: 'Project Github repo path, eg: angular/angular',
        demandOption: true
      },
      type: {
        type: 'string',
        choices: ['changelog', 'github'],
        description: 'Project changelog type',
        demandOption: true
      },
      hashtags: {
        type: 'string',
        description: 'Comma separated list of hashtags',
        demandOption: true
      },
      skip: {
        type: 'boolean',
        description: 'Skip latest version to trigger first release',
        default: false
      }
    },
    async ({ name, repo, type, hashtags, skip, debug }) => {
      configureLogger(debug);
      await initProjectData(name, repo, type, hashtags, skip);
    }
  )
  .command(
    ['changelog'],
    'Retrieve release changelog as image',
    {
      type: {
        type: 'string',
        description: 'Project changelog type',
        choices: ['changelog', 'github'],
        demandOption: true
      },
      repo: {
        type: 'string',
        description: 'Project Github repo path, eg: angular/angular',
        demandOption: true
      },
      release: {
        type: 'string',
        description: 'Release version name (eg: 6.0.0-rc.0)',
        demandOption: true
      },
      theme: {
        type: 'string',
        description: 'Theme of the changelog (eg: material)',
        default: 'default'
      }
    },
    async ({ debug, repo, type, theme, release }) => {
      configureLogger(debug);
      const project = { repo, type };
      await getChangelogAsImage(project, release, theme, true);
    }
  )
  .command(
    ['start'],
    'Run releasebot app, check for and tweet about new releases of projects',
    {
      schedule: {
        alias: 's',
        type: 'string',
        description: 'Cron style schedule',
        default: '*/30 * * * *'
      }
    },
    ({ debug, schedule }) => {
      configureLogger(debug);
      runReleaseWatcher(schedule);

      const app = express();
      app.use(express.static('public'));
      app.get('/changelog', getChangelogImage);
      app.listen(8080);
      logger.info('Server started, port:', 8080);
    }
  )
  .option('debug', { type: 'boolean', description: 'Set debug log level' })
  .help().argv;
