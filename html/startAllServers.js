const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = 5000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files (e.g., CSS, JavaScript) from the 'html' directory
app.use(express.static(path.join(__dirname, './')));

// Serve ec2 routes
const ec2Router = express.Router();
app.post('/launch-ec2', (req, res) => {
    const formData = req.body;


    const terraformInitCommand = 'terraform init';
    const terraformApplyCommand = `terraform apply -auto-approve -lock=false \
        -var="region=${formData.region}" \
        -var="access_key=${formData.access_key}" \
        -var="secret_key=${formData.secret_key}" \
        -var="ami=${formData.ami}" \
        -var="instancetype=${formData.instancetype}"`;


    exec(terraformInitCommand, (initError, initStdout, initStderr) => {
        if (initError) {
            console.error(`Error executing Terraform init: ${initStderr}`);
            res.status(500).send('Error initializing Terraform');
            return;
        }

        console.log(`Terraform init output: ${initStdout}`);

        // Introduce a delay
        setTimeout(() => {

            exec(terraformApplyCommand, (applyError, applyStdout, applyStderr) => {
                if (applyError) {
                    const errorMessage = applyStderr || 'Unknown error occurred during Terraform execution';
                    console.error(`Error executing Terraform apply: ${errorMessage}`);


                    if (errorMessage.includes('resource temporarily unavailable')) {
                        res.status(500).send('Error acquiring the Terraform state lock. Please try again later.');
                    } else {
                        res.status(500).send('Error launching S3 Bucket');
                    }
                } else {
                    console.log(`Terraform apply output: ${applyStdout}`);
                    res.status(200).send('S3 Bucket launched successfully');
                }
            });
        }, 5000); // Delay of 5000 milliseconds (5 seconds)
    });
});
app.use('/ec2', ec2Router);

// Serve s3 routes
const s3Router = express.Router();
s3Router.post('/launch-s3', (req, res) => {
    // Your s3 server logic...
    res.status(200).send('S3 launched successfully');
});
app.use('/s3', s3Router);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Optionally, run your start commands for individual servers (ec2server.js and s3server.js) here
const { spawn } = require('child_process');

// Define commands to run concurrently
const commands = [
    { command: 'cd ec2 && node ec2server.js', options: { shell: true } },
    { command: 'cd s3 && node s3server.js', options: { shell: true } }
];

// Function to spawn a child process for each command
function runCommand({ command, options }) {
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, options);

    child.stdout.on('data', (data) => {
        console.log(`${command} stdout: ${data}`);
    });

    child.stderr.on('data', (data) => {
        console.error(`${command} stderr: ${data}`);
    });

    child.on('close', (code) => {
        console.log(`${command} child process exited with code ${code}`);
    });
}

// Run each command concurrently
commands.forEach(runCommand);