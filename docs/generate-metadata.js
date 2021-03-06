import _ from 'lodash';
import glob from 'glob';
import fsp from 'fs-promise';
import promisify from './promisify';
import marked from 'marked';

const globp = promisify(glob);

import { parse, resolver } from 'react-docgen-fixed';

const basePath = '/../src/';

export default function generate() {
  return globp(`${__dirname}${basePath}**/*.jsx`)
    .then((files) => {
      const results = _.map(
        _.filter(files, (filename) => {
          // Only take files where the first letter is uppercase,
          // which we assume are React Components.
          const parts = filename.split('/');
          const componentName = _.last(parts);
          return (componentName[0] === _.upperCase(componentName[0]));
        }), (filename) => {
        const parts = filename.split('/');
        const componentPart = parts[parts.length - 3];
        return fsp.readFile(filename).then((content) => {
          let obj;
          try {
            obj = parse(content, resolver.findAllComponentDefinitions);
            obj[0].part = componentPart;
          } catch (e) {
            obj = null;
          }
          return obj;
        });
      });
      return Promise.all(results)
        .then((data) => {
          console.log(data);
          const obj = {};
          _.forEach(data, (compMeta) => {
            if (_.has(compMeta, '[0].displayName')) {
              const val = compMeta[0];
              val.htmlDescription = marked(val.description);
              _.forEach(val.props, (propKey) => {
                if (_.has(propKey, '.description')) {
                  _.set(
                    val.props,
                    `.${propKey}.htmlDescription`,
                    marked(_.get(val.props, `.${propKey}.description`))
                  );
                }
              });
              _.forEach(val.methods, (methodKey) => {
                if (_.has(methodKey, '.description')) {
                  _.set(
                    val.props,
                    `.${methodKey}.htmlDescription`,
                    marked(_.get(val.methods, `.${methodKey}.description`))
                  );
                }
              });
              val.part = compMeta[0].part;
              obj[compMeta[0].displayName] = val;
            } else {
              console.error(`Component ${compMeta} is missing displayName`);
            }
          });
          return obj;
        })
        .catch(e => setTimeout(() => { throw e; }));
    });
}
