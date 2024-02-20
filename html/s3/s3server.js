const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = 3000;
console.log(__dirname);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/launch-ec2', (req, res) => {
    const formData = req.body;


    const terraformInitCommand = 'terraform init';
    const terraformApplyCommand = `terraform apply -auto-approve -lock=false \
        -var="region=${formData.region}" \
        -var="access_key=${formData.access_key}" \
        -var="secret_key=${formData.secret_key}" \
        -var="bucketname=${formData.bucketname}"`;


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

// Serve static files (e.g., CSS, JavaScript) from the 'html' directory
app.use(express.static(path.join(__dirname, '../')));


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
