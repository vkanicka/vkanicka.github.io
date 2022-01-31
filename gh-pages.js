var ghpages = require('gh-pages');

ghpages.publish(
    'public', // path to public directory
    {
        branch: 'gh-pages',
        repo: 'https://github.com/vkanicka/vkanicka.github.io', // Update to point to your repository  
        user: {
            name: 'Victoria Kanicka', // update to use your name
            email: 'vkanicka@gmail.com' // Update to use your email
        }
    },
    () => {
        console.log('Deploy Complete!')
    }
)