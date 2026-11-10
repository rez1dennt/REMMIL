const { defineConfig } = require('@playwright/test');
module.exports=defineConfig({testDir:'./tests',testMatch:'**/*.spec.cjs',fullyParallel:false,workers:1,reporter:'list',timeout:30000,use:{baseURL:process.env.TEST_URL||'http://127.0.0.1:4174',channel:'chrome',headless:true,reducedMotion:'reduce'},outputDir:'qa/test-results'});
