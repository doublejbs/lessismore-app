import fs from 'node:fs';
import path from 'node:path';

const KOREAN_PATTERN = /[가-힣]/;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
]);

const collectSourceFiles = targetPath => {
  const stats = fs.statSync(targetPath);

  if (stats.isFile()) {
    return SOURCE_EXTENSIONS.has(path.extname(targetPath)) ? [targetPath] : [];
  }

  return fs.readdirSync(targetPath, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
      return [];
    }

    const entryPath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(entryPath);
    }

    return SOURCE_EXTENSIONS.has(path.extname(entry.name)) ? [entryPath] : [];
  });
};

const isIgnoredFile = filePath => {
  const normalizedPath = filePath.split(path.sep).join('/');

  return (
    normalizedPath === 'locales' ||
    normalizedPath.startsWith('locales/') ||
    normalizedPath.includes('/locales/') ||
    normalizedPath === 'constants/LegalTexts.ts' ||
    normalizedPath.endsWith('/constants/LegalTexts.ts')
  );
};

const findKoreanLiterals = source => {
  const findings = [];
  const sourceLines = source.split('\n');
  let state = 'code';
  let quote = '';
  let line = 1;
  let stringStartLine = 1;
  let stringValue = '';

  const flushString = () => {
    if (KOREAN_PATTERN.test(stringValue)) {
      const valueLines = stringValue.split('\n');

      valueLines.forEach((valueLine, index) => {
        if (KOREAN_PATTERN.test(valueLine)) {
          const findingLine = stringStartLine + index;
          const sourceLine = sourceLines[findingLine - 1] ?? '';

          if (
            !sourceLine.trim().startsWith('//') &&
            !sourceLine.trim().startsWith('*') &&
            !sourceLine.includes('// l10n-ignore')
          ) {
            findings.push(findingLine);
          }
        }
      });
    }

    stringValue = '';
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (state === 'lineComment') {
      if (character === '\n') {
        state = 'code';
        line += 1;
      }

      continue;
    }

    if (state === 'blockComment') {
      if (character === '*' && nextCharacter === '/') {
        state = 'code';
        index += 1;
      } else if (character === '\n') {
        line += 1;
      }

      continue;
    }

    if (state === 'string') {
      if (character === '\\') {
        stringValue += character;
        stringValue += nextCharacter ?? '';
        index += 1;
      } else if (character === quote) {
        flushString();
        state = 'code';
        quote = '';
      } else {
        stringValue += character;
        if (character === '\n') {
          line += 1;
        }
      }

      continue;
    }

    if (character === '/' && nextCharacter === '/') {
      state = 'lineComment';
      index += 1;
    } else if (character === '/' && nextCharacter === '*') {
      state = 'blockComment';
      index += 1;
    } else if (character === '"' || character === "'" || character === '`') {
      state = 'string';
      quote = character;
      stringStartLine = line;
    } else if (character === '\n') {
      line += 1;
    }
  }

  if (state === 'string') {
    flushString();
  }

  return [...new Set(findings)].sort((a, b) => a - b);
};

// L10N-10 7단계 완료: 인자가 없으면 저장소 전체를 검사한다.
// 단계별 확인이 필요하면 완료 도메인 디렉터리를 인자로 넘길 수 있다.
const targets = process.argv.slice(2);
const scanTargets = targets.length > 0 ? targets : ['.'];

const findings = [];

scanTargets.flatMap(collectSourceFiles).forEach(filePath => {
  if (isIgnoredFile(filePath)) {
    return;
  }

  const source = fs.readFileSync(filePath, 'utf8');

  findKoreanLiterals(source).forEach(line => {
    findings.push(`${filePath}:${line}`);
  });
});

if (findings.length > 0) {
  findings.forEach(finding => console.log(finding));
  process.exitCode = 1;
}
