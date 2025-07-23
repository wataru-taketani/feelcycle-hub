/**
 * Lambda環境のデバッグ情報を収集
 */
export declare function debugLambdaEnvironment(): Promise<{
    architecture: NodeJS.Architecture;
    platform: NodeJS.Platform;
    nodeVersion: string;
    environment: string;
    awsRegion: string | undefined;
    chromiumPaths: ({
        path: string;
        exists: any;
        isFile: any;
        permissions: any;
        error?: undefined;
    } | {
        path: string;
        error: any;
        exists?: undefined;
        isFile?: undefined;
        permissions?: undefined;
    })[];
    chromiumConfig: {
        args: any;
        defaultViewport: any;
        headless: any;
        executablePath: string;
        error?: undefined;
    } | {
        error: any;
        args?: undefined;
        defaultViewport?: undefined;
        headless?: undefined;
        executablePath?: undefined;
    };
}>;
