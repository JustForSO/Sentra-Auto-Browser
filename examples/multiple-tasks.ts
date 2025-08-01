import { Agent, BrowserSession, LLMFactory, Config } from '../src';

async function runTask(
  task: string,
  llm: any,
  browserSession: BrowserSession,
  agentSettings: any
): Promise<void> {
  console.log(`\n📋 Task: ${task}`);
  console.log('🚀 Starting execution...');

  const agent = new Agent(task, llm, browserSession, agentSettings);
  const history = await agent.run();

  const status = history.success ? '✅ Success' : '❌ Failed';
  console.log(`${status} - ${history.steps.length} steps in ${history.totalDuration.toFixed(2)}s`);

  if (!history.success && history.steps.length > 0) {
    const lastStep = history.steps[history.steps.length - 1];
    if (lastStep.result.error) {
      console.log(`   Error: ${lastStep.result.error}`);
    }
  }
}

async function main() {
  try {
    console.log('🔄 Multiple Tasks Example\n');

    // Get configuration
    const llmConfig = Config.getLLMConfig();
    const browserProfile = Config.getBrowserProfile();
    const agentSettings = Config.getAgentSettings();

    // Override some settings for multiple tasks
    agentSettings.maxSteps = 15; // Shorter tasks
    browserProfile.headless = true; // Run headless for speed

    console.log(`Using LLM: ${llmConfig.provider} - ${llmConfig.model}`);
    console.log(`Browser mode: headless`);
    console.log(`Max steps per task: ${agentSettings.maxSteps}\n`);

    // Create LLM instance
    const llm = LLMFactory.createLLM(llmConfig);

    // Create browser session (reuse for all tasks)
    const browserSession = new BrowserSession(browserProfile);
    await browserSession.start();

    // Define multiple tasks
    const tasks = [
      "Go to google.com and search for 'weather today'",
      "Go to github.com and find the trending repositories",
      "Go to stackoverflow.com and search for 'javascript promises'",
      "Go to wikipedia.org and search for 'artificial intelligence'",
    ];

    console.log(`🎯 Running ${tasks.length} tasks sequentially...\n`);

    const startTime = Date.now();
    let successCount = 0;

    // Run tasks sequentially
    for (let i = 0; i < tasks.length; i++) {
      const taskNumber = i + 1;
      console.log(`\n--- Task ${taskNumber}/${tasks.length} ---`);
      
      try {
        await runTask(tasks[i], llm, browserSession, agentSettings);
        successCount++;
      } catch (error) {
        console.log(`❌ Task ${taskNumber} failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Small delay between tasks
      if (i < tasks.length - 1) {
        console.log('⏳ Waiting 2 seconds before next task...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 EXECUTION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total tasks: ${tasks.length}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Failed: ${tasks.length - successCount}`);
    console.log(`Success rate: ${((successCount / tasks.length) * 100).toFixed(1)}%`);
    console.log(`Total time: ${totalTime.toFixed(2)} seconds`);
    console.log(`Average time per task: ${(totalTime / tasks.length).toFixed(2)} seconds`);

    // Close browser
    await browserSession.close();
    console.log('\n🎉 All tasks completed!');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the example
main();
