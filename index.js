const { Transform } = require('stream');

let findFn = (v, content) => content.indexOf(v) > -1;
exports.find = findFn;

let countFn = (v, content) => {
    let out = 0;
    out = content.match(new RegExp(v, 'ig')).length;
    return out;
};
exports.count = countFn;

let extractFn = (v, content) => {
    let out = '';
    out = content.split('\n').filter(l => findFn(v, l)).join('\n');
    return out;
};
exports.extract = extractFn;

const _extractFlag = '--extract';
exports.extractFlag = _extractFlag;

const _regularExpressionFlag = '--re';
exports.regularExpressionFlag = _regularExpressionFlag;

let hasNotExtraction = v => {
    return v !== _extractFlag;
};
exports.hasNotExtraction = hasNotExtraction;

let hasNotRegExp = v => {
    return v !== _regularExpressionFlag;
};
exports.hasNotRegExp = hasNotRegExp;

let hasNotExtractionWithRegExpFlag = v => {
    let out = false;
    let isNotExtractFlag = hasNotExtraction(v);
    let isNotRegExpFlag = v !== _regularExpressionFlag;
    out = (isNotExtractFlag && isNotRegExpFlag);
    return out;
};
exports.hasNotExtractionWithRegExpFlag = hasNotExtractionWithRegExpFlag;

let findAndHasNotFlags = (v, content) => {
    return hasNotExtractionWithRegExpFlag(v) && findFn(v, content);
};
exports.findAndHasNotFlags = findAndHasNotFlags;

let findAndHasNotFlag = (v, content) => {
    return hasNotExtraction(v) && findFn(v, content);
};
exports.findAndHasNotFlag = findAndHasNotFlag;

let hasRegExpFlagInArgs = (args) => {
    return args.indexOf(_regularExpressionFlag) > -1;
};
exports.hasRegExpFlagInArgs = hasRegExpFlagInArgs;

let hasNotExtractFlagWithPresence = (args, presence) => {
    return args.indexOf(_extractFlag) === -1 && (presence.length);
}
exports.hasNotExtractFlagWithPresence = hasNotExtractFlagWithPresence;

let searchDataTransformFn = (args, filePath, line) => {
    let presenceFn = (raw, args) => {
        return args.filter(v => {
            if (findAndHasNotFlags(v, raw)) {
                return v;
            } if (findAndHasNotFlag(v, raw)) {
                return v;
            }
        });
    };

    let prepareRegExpPresence = (args, presence) => {
      if (hasRegExpFlagInArgs(args) && (presence.length)) {
          presenceRegexp = presence.map(v => {
              return new RegExp(v);
          });
      }
    };

    return new Transform({
        transform(chunk, encoding, callback) {
            let raw = chunk.toString();
            let presence = presenceFn(raw, args);
            let presenceRegexp = prepareRegExpPresence(args, presence);

            if (hasNotExtractFlagWithPresence(args, presence)) {
                    presence = presence.map(v => v + ' (' + countFn(v, raw) + ')')
                    if (process.stdin.isTTY) {
                        this.push(Buffer.from(filePath + ':' + line + '\n' + presence.join('\n') + '\n'));
                    }

                    if (!process.stdin.isTTY) {
                        this.push(Buffer.from(presence.join('\n')) + '\n');
                    }
            } else if (args.indexOf(_extractFlag) > -1 && (presence.length)) {
                if (args.indexOf(_regularExpressionFlag) === -1) {
                    presence = presence.map(v => extractFn(v, raw));
                } else if (args.indexOf(_regularExpressionFlag > -1)) {
                    presence = presenceRegexp.map((v, i) => {
                        let out = '';
                        let matchingCase = raw.match(v);
                        out = matchingCase[0] + ' (' + matchingCase.input + ')'
                        return out;
                    });
                }

                if (process.stdin.isTTY) {
                    this.push(Buffer.from(filePath + ':' + line + '\n' + presence.join('\n')) + '\n');
                }

                if (!process.stdin.isTTY) {
                    this.push(Buffer.from(presence.join('\n')) + '\n');
                }
            }

            callback();
        }
    });
};
exports.searchDataTransform = searchDataTransformFn;
