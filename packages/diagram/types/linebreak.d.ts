declare module "linebreak" {
    export interface Break {
        readonly position: number;
        readonly required: boolean;
    }
    class LineBreaker {
        constructor(string: string);
        nextCodePoint(): number;
        nextCharClass(): number;
        getSimpleBreak(): false | null;
        getPairTableBreak(lastClas: number): boolean;
        nextBreak(): Break | null;
    }
    export default LineBreaker;
}
