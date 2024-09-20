import React, { useState } from "react";
import { Button, Card } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";


function eoaWalletDetails({ address, Balance }) {



    return (
        <div>
            <Card.Body>
                <Card.Text>
                    <strong>Address: </strong>
                    {address}
                </Card.Text>

                <Card.Text>
                    <strong>Balance: </strong>
                    {Balance}
                </Card.Text>
            </Card.Body>
        </div>
    )

}


export default eoaWalletDetails;