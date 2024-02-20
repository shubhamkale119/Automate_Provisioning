provider "aws" {

    region = var.region
    secret_key = var.secret_key
    access_key = var.access_key

}

resource "aws_instance" "example" {


    ami = var.ami
    instance_type = var.instancetype
    

}
