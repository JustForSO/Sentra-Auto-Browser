import { Agent, BrowserSession, LLMFactory, Config } from '../src';

async function main() {
  try {
    console.log('🤖 Simple Browser Use Example\n');

    // Get configuration from environment
    const llmConfig = Config.getLLMConfig();
    const browserProfile = Config.getBrowserProfile();
    const agentSettings = Config.getAgentSettings();

    console.log(`Using LLM: ${llmConfig.provider} - ${llmConfig.model}`);
    console.log(`Browser mode: ${browserProfile.headless ? 'headless' : 'visible'}\n`);

    // Create LLM instance
    const llm = LLMFactory.createLLM(llmConfig);

    // Create browser session
    const browserSession = new BrowserSession(browserProfile);
    await browserSession.start();

    // Define the task
    const task = "Go to google.com and search for 'Node.js tutorial'";

    // Create and run agent
    const agent = new Agent(task, llm, browserSession, agentSettings);
    
    console.log(`📋 Task: ${task}\n`);
    console.log('🚀 Starting execution...\n');

    const history = await agent.run();

    // Display results
    console.log('\n✅ Execution completed!');
    console.log(`Success: ${history.success}`);
    console.log(`Steps taken: ${history.steps.length}`);
    console.log(`Duration: ${history.totalDuration.toFixed(2)} seconds`);

    if (history.steps.length > 0) {
      console.log('\n📊 Steps taken:');
      history.steps.forEach((step, index) => {
        const status = step.result.success ? '✅' : '❌';
        console.log(`  ${index + 1}. ${status} ${step.action.type} - ${step.result.message}`);
      });
    }

    // Close browser
    await browserSession.close();
    console.log('\n🎉 Done!');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the example
main();
