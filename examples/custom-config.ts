import { Agent, BrowserSession, LLMFactory } from '../src';

async function main() {
  try {
    console.log('🔧 Custom Configuration Example\n');

    // Custom LLM configuration
    const llmConfig = {
      provider: 'openai' as const,
      model: 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY!,
      temperature: 0.1,
    };

    // Custom browser configuration
    const browserProfile = {
      headless: false, // Run in visible mode
      viewport: { width: 1920, height: 1080 },
      timeout: 60000, // 60 seconds timeout
    };

    // Custom agent settings
    const agentSettings = {
      maxSteps: 20,
      maxActionsPerStep: 2,
      useVision: true,
    };

    console.log('Configuration:');
    console.log(`  LLM: ${llmConfig.provider} - ${llmConfig.model}`);
    console.log(`  Browser: ${browserProfile.headless ? 'headless' : 'visible'} (${browserProfile.viewport.width}x${browserProfile.viewport.height})`);
    console.log(`  Max steps: ${agentSettings.maxSteps}`);
    console.log(`  Vision: ${agentSettings.useVision ? 'enabled' : 'disabled'}\n`);

    // Validate and create LLM
    LLMFactory.validateConfig(llmConfig);
    const llm = LLMFactory.createLLM(llmConfig);

    // Create browser session with custom profile
    const browserSession = new BrowserSession(browserProfile);
    await browserSession.start();

    // Define a more complex task
    const task = "Go to amazon.com, search for 'wireless headphones', and find the price of the first result";

    // Create agent with custom settings
    const agent = new Agent(task, llm, browserSession, agentSettings);
    
    console.log(`📋 Task: ${task}\n`);
    console.log('🚀 Starting execution...\n');

    const history = await agent.run();

    // Display detailed results
    console.log('\n✅ Execution completed!');
    console.log(`Success: ${history.success}`);
    console.log(`Steps taken: ${history.steps.length}`);
    console.log(`Duration: ${history.totalDuration.toFixed(2)} seconds`);

    if (history.steps.length > 0) {
      console.log('\n📊 Detailed step breakdown:');
      history.steps.forEach((step, index) => {
        const status = step.result.success ? '✅' : '❌';
        const timestamp = step.timestamp.toLocaleTimeString();
        console.log(`  ${index + 1}. [${timestamp}] ${status} ${step.action.type}`);
        
        if (step.action.type === 'click') {
          console.log(`     → Clicked element at index ${step.action.index}`);
        } else if (step.action.type === 'type') {
          console.log(`     → Typed: "${step.action.text}"`);
        } else if (step.action.type === 'navigate') {
          console.log(`     → Navigated to: ${step.action.url}`);
        }
        
        if (step.result.message) {
          console.log(`     → Result: ${step.result.message}`);
        }
        
        if (step.result.error) {
          console.log(`     → Error: ${step.result.error}`);
        }
      });
    }

    // Show final page info
    const finalUrl = browserSession.getCurrentUrl();
    const finalTitle = await browserSession.getCurrentTitle();
    console.log(`\n📄 Final page: ${finalTitle} (${finalUrl})`);

    // Close browser
    await browserSession.close();
    console.log('\n🎉 Done!');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the example
main();
