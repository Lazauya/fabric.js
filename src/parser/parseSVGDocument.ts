import { fabric } from '../../HEADER';
import { applyViewboxTransform } from './applyViewboxTransform';
import {
  clipPaths,
  cssRules,
  gradientDefs,
  svgInvalidAncestorsRegEx,
  svgValidTagNamesRegEx,
  TClipPathCollection,
} from './constants';
import { getCSSRules } from './getCSSRules';
import { getGradientDefs } from './getGradientDefs';
import { hasAncestorWithNodeName } from './hasAncestorWithNodeName';
import { parseElements } from './parseElements';
import { parseUseDirectives } from './parseUseDirectives';
import {
  ElementsParserOptions,
  ElementsParserParsingOptions,
  TReviver,
} from './elements_parser';

export type TParseSVGDocumentCallback = (
  instances: FabricObject[],
  options: ElementsParserOptions,
  elements?: Element[],
  descendants?: Element[]
) => void;
import { FabricObject } from '../shapes/fabricObject.class';

/**
 * Parses an SVG document, converts it to an array of corresponding fabric.* instances and passes them to a callback
 * @static
 * @function
 * @memberOf fabric
 * @param {SVGDocument} doc SVG document to parse
 * @param {Function} callback Callback to call when parsing is finished;
 * It's being passed an array of elements (parsed from a document).
 * @param {Function} [reviver] Method for further parsing of SVG elements, called after each fabric object created.
 * @param {Object} [parsingOptions] options for parsing document
 * @param {String} [parsingOptions.crossOrigin] crossOrigin settings
 * @param {AbortSignal} [parsingOptions.signal] see https://developer.mozilla.org/en-US/docs/Web/API/AbortController/signal
 */
export function parseSVGDocument(
  doc: HTMLElement,
  callback: TParseSVGDocumentCallback,
  reviver: TReviver,
  parsingOptions: ElementsParserParsingOptions
) {
  if (!doc) {
    return;
  }
  if (
    parsingOptions &&
    parsingOptions.signal &&
    parsingOptions.signal.aborted
  ) {
    throw new Error('`options.signal` is in `aborted` state');
  }
  parseUseDirectives(doc);

  const svgUid = FabricObject.__uid++,
    options: ElementsParserParsingOptions = applyViewboxTransform(doc);
  let descendants = Array.from(doc.getElementsByTagName('*'));
  options.crossOrigin = parsingOptions && parsingOptions.crossOrigin;
  options.svgUid = svgUid;
  options.signal = parsingOptions && parsingOptions.signal;

  // TODO: see about typing isLikelyNode???
  // @ts-ignore
  if (descendants.length === 0 && isLikelyNode) {
    // we're likely in node, where "o3-xml" library fails to gEBTN("*")
    // https://github.com/ajaxorg/node-o3-xml/issues/21
    // TODO: aparently selectNodes is a .NET thing. see about replacing?
    descendants = (doc as any).selectNodes('//*[name(.)!="svg"]').slice();
  }

  const elements = descendants.filter(function (el) {
    applyViewboxTransform(el);
    return (
      svgValidTagNamesRegEx.test(el.nodeName.replace('svg:', '')) &&
      !hasAncestorWithNodeName(el, svgInvalidAncestorsRegEx)
    ); // http://www.w3.org/TR/SVG/struct.html#DefsElement
  });
  if (!elements || (elements && !elements.length)) {
    callback && callback([], {});
    return;
  }
  const localClipPaths: TClipPathCollection = {};
  descendants
    .filter(function (el) {
      return el.nodeName.replace('svg:', '') === 'clipPath';
    })
    .forEach(function (el) {
      const id = el.getAttribute('id');
      if (id == null) return;
      localClipPaths[id] = Array.from(el.getElementsByTagName('*')).filter(
        function (el) {
          return svgValidTagNamesRegEx.test(el.nodeName.replace('svg:', ''));
        }
      );
    });
  gradientDefs[svgUid] = getGradientDefs(doc);
  cssRules[svgUid] = getCSSRules(doc);
  clipPaths[svgUid] = localClipPaths;
  // Precedence of rules:   style > class > attribute
  parseElements(
    elements,
    function (instances, elements) {
      if (callback) {
        callback(instances, options, elements, descendants);
        delete gradientDefs[svgUid];
        delete cssRules[svgUid];
        delete clipPaths[svgUid];
      }
    },
    Object.assign({}, options),
    reviver,
    parsingOptions
  );
}
