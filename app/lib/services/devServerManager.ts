import type { WebContainer } from '@webcontainer/api';
import { atom } from 'nanostores';
import type { RaxShell } from '~/utils/shell';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('DevServerManager');

export interface DevServerState {
  dependenciesInstalled: boolean;
  serverRunning: boolean;
  packageManager: 'pnpm' | 'npm' | null;
  devScript: string | null;
  lastChecked: number;
  autoStartEnabled: boolean;
}

export class DevServerManager {
  #webcontainer: Promise<WebContainer>;
  #raxShell: RaxShell | null = null;
  #checkInterval: NodeJS.Timeout | null = null;
  #isChecking = false;
  
  state = atom<DevServerState>({
    dependenciesInstalled: false,
    serverRunning: false,
    packageManager: null,
    devScript: null,
    lastChecked: 0,
    autoStartEnabled: true,
  });

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;
  }

  setRaxShell(shell: RaxShell) {
    this.#raxShell = shell;
  }

  async checkDependenciesInstalled(): Promise<boolean> {
    try {
      const wc = await this.#webcontainer;
      
      try {
        await wc.fs.readFile('package.json', 'utf-8');
      } catch {
        logger.debug('No package.json found');
        return false;
      }

      try {
        const entries = await wc.fs.readdir('.');
        const hasNodeModules = entries.some((entry) => entry.name === 'node_modules');
        logger.debug('Dependencies installed:', hasNodeModules);
        return hasNodeModules;
      } catch {
        return false;
      }
    } catch (error) {
      logger.error('Error checking dependencies:', error);
      return false;
    }
  }

  async checkServerRunning(): Promise<boolean> {
    try {
      const wc = await this.#webcontainer;
      
      const psProcess = await wc.spawn('ps', ['aux']);
      const psOutput = await new Promise<string>((resolve) => {
        let output = '';
        psProcess.output.pipeTo(
          new WritableStream({
            write(chunk) {
              output += chunk;
            },
            close() {
              resolve(output);
            },
          }),
        );
      });

      const isRunning = 
        psOutput.includes('vite') ||
        psOutput.includes('webpack') ||
        psOutput.includes('next dev') ||
        psOutput.includes('npm run dev') ||
        psOutput.includes('pnpm run dev') ||
        psOutput.includes('react-scripts') ||
        psOutput.includes('astro dev') ||
        psOutput.includes('remix dev');

      logger.debug('Server running:', isRunning);
      return isRunning;
    } catch (error) {
      logger.error('Error checking server status:', error);
      return false;
    }
  }

  async getPackageInfo(): Promise<{ packageManager: 'pnpm' | 'npm'; devScript: string | null }> {
    try {
      const wc = await this.#webcontainer;
      const packageJsonContent = await wc.fs.readFile('package.json', 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      const scripts = packageJson?.scripts || {};

      const { webcontainerContext } = await import('~/lib/webcontainer');
      const packageManager = webcontainerContext.pnpmReady ? 'pnpm' : 'npm';

      const preferredCommands = ['dev', 'start', 'preview'];
      const devScript = preferredCommands.find((cmd) => scripts[cmd]) || null;

      return { packageManager, devScript };
    } catch (error) {
      logger.error('Error reading package.json:', error);
      return { packageManager: 'npm', devScript: null };
    }
  }

  async performCheck(): Promise<void> {
    if (this.#isChecking) {
      logger.debug('Check already in progress, skipping');
      return;
    }

    this.#isChecking = true;

    try {
      logger.info('Performing dev environment check...');

      const [dependenciesInstalled, serverRunning, packageInfo] = await Promise.all([
        this.checkDependenciesInstalled(),
        this.checkServerRunning(),
        this.getPackageInfo(),
      ]);

      this.state.set({
        dependenciesInstalled,
        serverRunning,
        packageManager: packageInfo.packageManager,
        devScript: packageInfo.devScript,
        lastChecked: Date.now(),
        autoStartEnabled: this.state.get().autoStartEnabled,
      });

      logger.info('Check complete:', this.state.get());
    } catch (error) {
      logger.error('Error during check:', error);
    } finally {
      this.#isChecking = false;
    }
  }

  async autoStart(): Promise<void> {
    const currentState = this.state.get();

    if (!currentState.autoStartEnabled) {
      logger.info('Auto-start disabled');
      return;
    }

    if (!this.#raxShell) {
      logger.warn('RaxShell not available, cannot auto-start');
      return;
    }

    try {
      await this.#raxShell.ready();

      logger.info('Auto-start check:', {
        dependenciesInstalled: currentState.dependenciesInstalled,
        serverRunning: currentState.serverRunning,
        devScript: currentState.devScript,
      });

      if (!currentState.dependenciesInstalled && currentState.packageManager) {
        logger.info('Installing dependencies...');
        const installCmd = currentState.packageManager === 'pnpm' ? 'pnpm install' : 'npm install';
        
        if (this.#raxShell.terminal) {
          this.#raxShell.terminal.input(installCmd + '\n');
          
          let attempts = 0;
          while (attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const installed = await this.checkDependenciesInstalled();
            if (installed) {
              logger.info('Dependencies installed successfully');
              this.state.set({
                ...this.state.get(),
                dependenciesInstalled: true,
              });
              break;
            }
            attempts++;
          }
        }
      }

      const latestState = this.state.get();
      if (latestState.dependenciesInstalled && !latestState.serverRunning && latestState.devScript) {
        logger.info('Starting dev server...');
        const devCmd = `${latestState.packageManager} run ${latestState.devScript}`;
        
        if (this.#raxShell.terminal) {
          this.#raxShell.terminal.input(devCmd + '\n');
          
          this.state.set({
            ...this.state.get(),
            serverRunning: true,
          });

          logger.info('Dev server started');
        }
      } else if (latestState.serverRunning) {
        logger.info('Dev server already running');
      } else {
        logger.info('Cannot start dev server:', {
          dependenciesInstalled: latestState.dependenciesInstalled,
          devScript: latestState.devScript,
        });
      }
    } catch (error) {
      logger.error('Error during auto-start:', error);
    }
  }

  startMonitoring(intervalMs: number = 10000): void {
    if (this.#checkInterval) {
      logger.debug('Monitoring already started');
      return;
    }

    logger.info('Starting dev environment monitoring');

    this.performCheck().then(() => this.autoStart());

    this.#checkInterval = setInterval(async () => {
      await this.performCheck();
      
      const currentState = this.state.get();
      if (currentState.dependenciesInstalled && !currentState.serverRunning && currentState.autoStartEnabled) {
        logger.info('Server stopped, attempting to restart...');
        await this.autoStart();
      }
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.#checkInterval) {
      clearInterval(this.#checkInterval);
      this.#checkInterval = null;
      logger.info('Monitoring stopped');
    }
  }

  setAutoStartEnabled(enabled: boolean): void {
    this.state.set({
      ...this.state.get(),
      autoStartEnabled: enabled,
    });
    logger.info('Auto-start', enabled ? 'enabled' : 'disabled');
  }

  async checkAndStart(): Promise<void> {
    await this.performCheck();
    await this.autoStart();
  }
}
