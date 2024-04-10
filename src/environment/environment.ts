export class Environment {
    fileSystem: FileSystem;
    browser: Browser;
    terminal: Terminal;
    user_interface: UserInterface;
    linter: Linter;

    constructor(fileSystem: FileSystem, browser: Browser, terminal: Terminal, user_interface: UserInterface, linter: Linter) {
        this.fileSystem = fileSystem;
        this.browser = browser;
        this.terminal = terminal;
        this.user_interface = user_interface;
        this.linter = linter;
    }

    async getFileSystem(): Promise<FileSystemTree> {
        return this.fileSystem.getFileSystem();
    }
    async getBrowserState(): Promise<BrowserTab[]> {
        return this.browser.getBrowserState();
    }
    async getTerminalState(): Promise<TerminalTab[]> {
        return this.terminal.getTerminalState();
    }
    async writeFile(path: string, content: string): Promise<void> {
        return await this.fileSystem.writeFile(this, path, content);
    }
    async deleteFile(path: string): Promise<void> {
        await this.fileSystem.deleteFile(this, path);
    }
    async readFile(path: string): Promise<string> {
        return await this.fileSystem.readFile(this, path);
    }
    async pathExists(path: string): Promise<boolean> {
        return await this.fileSystem.exists(path);
    }
    async runCommand(command: string, tabIndex?: number | "new", timeout?: number, isHardTimeout?: boolean): Promise<string> {
        return this.terminal.runCommand(command, tabIndex, timeout, isHardTimeout);
    }
    async openUrl(url: string, tabIndex?: number): Promise<string> {
        return this.browser.openUrl(url, tabIndex);
    }
    async showMessage(message: string): Promise<void> {
        this.user_interface.showMessage(message);
    }
    async askPrompt(prompt: string): Promise<string> {
        return this.user_interface.askPrompt(prompt);
    }
    async getNewMessages(): Promise<string[]> {
        return this.user_interface.getNewMessages();
    }
    async getLinterOutput(): Promise<string> {
        return await this.linter.getOutput();
    }
    async lintFile(path: string): Promise<{ output: string, is_ok: boolean }> {
        return await this.linter.lintFile(path);
    }
}

export interface UserInterface {
    showMessage(message: string): Promise<void>;
    askPrompt(prompt: string): Promise<string>;
    getNewMessages(): Promise<string[]>;
}

export class FileSystemTree {
    path: string;
    isDirectory: boolean;
    content: string[] | null;
    children?: FileSystemTree[];

    constructor(path: string, isDirectory: boolean, content: string[] | null, children?: FileSystemTree[]) {
        this.path = path;
        this.isDirectory = isDirectory;
        this.content = content;
        this.children = children;
    }

    getByPath(path: string): FileSystemTree | null {
        if (this.path === path) return this;
        if (this.children) {
            for (let child of this.children) {
                const result = child.getByPath(path);
                if (result) return result;
            }
        }
        return null;
    }
}

export interface FileSystem {
    rootPath: string;

    getFileSystem(): Promise<FileSystemTree>;
    writeFile(env: Environment, path: string, content: string): Promise<void>;
    deleteFile(env: Environment, path: string): Promise<void>;
    readFile(env: Environment, path: string): Promise<string>;
    exists(path: string): Promise<boolean>;
}

interface BrowserTab {
    url: string;
    html: string;
}

export interface Browser {
    getBrowserState(): Promise<BrowserTab[]>;
    openUrl(url: string, tabIndex?: number): Promise<string>;
}

export interface TerminalTab {
    history: string[];
}

export interface Terminal {
    getTerminalState(): Promise<TerminalTab[]>;
    runCommand(command: string, tabIndex?: number | "new", timeout?: number, isHardTimeout?: boolean): Promise<string>;   // returns the tab index
}

export interface Linter {
    getOutput(): Promise<string>;
    lintFile(path: string): Promise<{ output: string, is_ok: boolean }>;
}

export class DummyTerminal implements Terminal {
    async getTerminalState(): Promise<TerminalTab[]> {
        return [];
    }
    async runCommand(command: string, tabIndex?: number): Promise<string> {
        return "";
    }
}

export class DummyBrowser implements Browser {
    async getBrowserState(): Promise<BrowserTab[]> {
        return [];
    }
    async openUrl(url: string, tabIndex?: number): Promise<string> {
        return "";
    }
}

// import * as inquirer from 'inquirer';

export class CLIUserInterface implements UserInterface {
    async showMessage(message: string): Promise<void> {
        console.log(message);
    }
    async askPrompt(prompt: string): Promise<string> {
        // ask for input from the user using inquirer
        const inquirer = await import('inquirer');
        const response = await inquirer.default.prompt([
            {
                type: 'input',
                name: 'response',
                message: prompt
            }
        ]);
        return response.response;
    }
    async getNewMessages(): Promise<string[]> {
        return [];
    }
}

export class TrunkLinter implements Linter {
    repo_path: string;
    constructor(repo_path: string) {
        try {
            require('child_process').execSync('trunk init -n', { cwd: repo_path, input: " " });
        } catch (e: any) {
            console.log(e.stdout.toString());
        }

        this.repo_path = repo_path;
    }

    async getOutput(): Promise<string> {
        let res;
        console.log("Running the linter...")
        try {
            res = (require('child_process').execSync('trunk check -n', { cwd: this.repo_path, timeout: 60000 })).toString();
        } catch (e: any) {
            res = e.stdout.toString();
        }
        // console.log("Linter output: ", res);
        // console.log("Linter finished.")
        console.log(res)
        if (res.includes('Please run ') || res.includes('Trunk can only')) {
            return "";
        }
        return res;
    }

    // use Flake8 for LintFile
    async lintFile(path: string): Promise<{ output: string, is_ok: boolean }> {
        let res;
        try {
            res = (require('child_process').execSync(`flake8 --select=F821,F822,F831,E111,E112,E113,E999,E902 ${path}`, { cwd: this.repo_path })).toString();
        } catch (e: any) {
            res = e.stdout.toString();
        }
        return { output: res.trim(), is_ok: res.trim() === "" };
    }
}

