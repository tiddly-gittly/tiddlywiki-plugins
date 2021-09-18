import { ICachedFile } from '.';

export class InverseFilesIndex {
  private inverseFilesIndex: Record<string, ICachedFile> = {};
  get(fileRelativePath: string): ICachedFile {
    return this.inverseFilesIndex[fileRelativePath];
  }
  set(fileRelativePath: string, file: ICachedFile) {
    this.inverseFilesIndex[fileRelativePath] = file;
  }
  delete(fileRelativePath: string) {
    if (this.inverseFilesIndex[fileRelativePath]) {
      delete this.inverseFilesIndex[fileRelativePath];
    }
  }
}
