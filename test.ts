import * as ts from 'typescript';

// Compiler options including emitDecoratorMetadata and experimentalDecorators.
const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.ES2015,
  emitDecoratorMetadata: true,
  experimentalDecorators: true,
  sourceMap: false,
  declaration: true,
};

// Make a in-memory host and populate it with a single file
const fileMap = new Map<string, string>();
const sourcesMap = new Map<string, ts.SourceFile>();
const outputs = new Map<string, string>();

const host: ts.CompilerHost = {
  getSourceFile: (fileName) => sourcesMap.get(fileName),
  getDefaultLibFileName: () => 'lib.d.ts',
  getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
  getDirectories: () => [],
  getCanonicalFileName: (fileName) => fileName,
  useCaseSensitiveFileNames: () => true,
  getNewLine: () => ts.sys.newLine,
  fileExists: (fileName) => fileMap.has(fileName),
  readFile: (fileName) => fileMap.has(fileName) ? fileMap.get(fileName) : '',
  writeFile: (fileName, text) => outputs.set(fileName, text),
};


fileMap.set('/file.ts', `
  export const value = 42;
`);

// Create the SourceFile
fileMap.forEach((v, k) => sourcesMap.set(
  k, ts.createSourceFile(k, v, ts.ScriptTarget.Latest)));

// Create the TS program.
const program = ts.createProgram(['/file.ts'], compilerOptions, host);
const sourceFile = program.getSourceFile('/file.ts');

// Simple transform that logs the filename of what it's transforming and renames identifiers.
const logFileAndRenameTransform: ts.TransformerFactory<ts.SourceFile> = (context) =>
  (bundleOrSourceFile) => {
    if (ts.isBundle(bundleOrSourceFile)) {
      console.log('logFileAndRenameTransform: transforming bundle');
      return bundleOrSourceFile;
    } else {
      console.log(`logFileAndRenameTransform: transforming source file: ${bundleOrSourceFile.fileName}`);

      const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
        if (ts.isIdentifier(node)) {
          return ts.createIdentifier('renamedIdentifier');
        }

        // Otherwise return node as is.
        return ts.visitEachChild(node, visitor, context);
      };

      return ts.visitNode(bundleOrSourceFile, visitor);
    }
  };

// Emit file.ts, using removeTransform.
const { emitSkipped } = program.emit(
  sourceFile, undefined, undefined, undefined, { 
    before: [logFileAndRenameTransform],
    afterDeclarations: [logFileAndRenameTransform],
  }
);

if (emitSkipped) {
  throw new Error(`Emit failed.`);
}

// Print the emitted file.
console.log('\nEmit successfull:');
console.log('--- /file.js ---');
console.log(outputs.get('/file.js'));
console.log('--- /file.d.ts ---');
console.log(outputs.get('/file.d.ts'));