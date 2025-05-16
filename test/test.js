const { extractTextFromHtml } = require('../dist');

// Sample HTML strings for testing
const samples = [
  {
    name: 'Simple HTML',
    html: '<div><h1>Title</h1><p>This is a paragraph with <b>bold</b> text.</p></div>',
    expected: 'Title This is a paragraph with bold text.'
  },
  {
    name: 'HTML with entities',
    html: '<p>This &amp; that with &lt;angle brackets&gt; and &quot;quotes&quot;</p>',
    expected: 'This & that with <angle brackets> and "quotes"'
  },
  {
    name: 'HTML with hidden content',
    html: '<div>Visible <span style="display:none">Hidden</span> Content</div>',
    expected: 'Visible Content'
  },
  {
    name: 'HTML with images',
    html: '<div>Text with <img src="img.jpg" alt="an image"> inline</div>',
    expected: 'Text with [Image: an image] inline'
  },
  {
    name: 'HTML with scripts and styles',
    html: '<div>Text<script>var x = 10;</script><style>.hide{display:none}</style>Content</div>',
    expected: 'TextContent'
  }
];

// Run tests
console.log('Running HTML text extraction tests...\n');

let passCount = 0;

samples.forEach((sample, index) => {
  console.log(`Test ${index + 1}: ${sample.name}`);
  
  const result = extractTextFromHtml(sample.html);
  const normalizedResult = result.trim().replace(/\s+/g, ' ');
  const normalizedExpected = sample.expected.trim().replace(/\s+/g, ' ');
  
  const passed = normalizedResult === normalizedExpected;
  
  console.log(`  Input: ${sample.html.length > 50 ? sample.html.substring(0, 50) + '...' : sample.html}`);
  console.log(`  Expected: ${normalizedExpected}`);
  console.log(`  Result: ${normalizedResult}`);
  console.log(`  ${passed ? '✓ PASSED' : '✗ FAILED'}`);
  console.log();
  
  if (passed) passCount++;
});

console.log(`${passCount}/${samples.length} tests passed`);

if (passCount === samples.length) {
  console.log('All tests passed successfully!');
} else {
  console.log('Some tests failed. Check the output above for details.');
} 