/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
/**
 * Write your transction processor functions here
 */
/**
 * Adding Participant transaction
 * @param {health.AddPatient} addPatient
 * @transaction
 */
function addPatient(tx) {
    var factory = getFactory();
    var NS="health"
    var asset = factory.newResource(NS,'Patient',tx.patientDetails.MrnNumber);
    asset = tx.patientDetails;
    return getParticipantRegistry(NS+'Patient')
    .then(function(pa){
        return pa.add(asset) 
    })

}
/**
 * Adding Provider
 * @param {health.AddProvider} addProvider
 * @transaction
 */
function addProvider(tx) {
    var factory = getFactory();
    var NS="health"
    var asset = factory.newResource(NS,'Provider',tx.Provider_details.providerId);
    asset = tx.Provider_details;
    return getParticipantRegistry(NS+'Provider')
    .then(function(pa){
        return pa.add(asset) 
    })

}
/**
 * Adding Insurer
 * @param {health.AddInsurer} addInsurer
 * @transaction
 */
function addInsurer(tx) {
    var factory = getFactory();
    var NS="health"
    var asset = factory.newResource(NS,'InsuranceProvider',tx.insurer_details.insuranceProviderId);
    asset = tx.insurer_details;
    return getParticipantRegistry(NS+'InsuranceProvider')
    .then(function(pa){
        return pa.add(asset) 
    })

}

/**
 * Register Insurance form the patient
 * @param {health.Register_Insurance} registerInsurance
 * @transaction
 */
function registerInsurance(tx) {
    var factory = getFactory();
    var insurer= getCurrentParticipant();
    var patient = tx.patient_id;
    if(!patient.InsuranceProviders){
        patient.InsuranceProviders = []
    }
    var NS="health"
    var medicAsset = factory.newResource(NS,'MedicInsurance',tx.Insurance_id);
    medicAsset.patient = tx.patient_id;
    medicAsset.InsuranceCompanyId = insurer;
    medicAsset.Cost_of_insurance = tx.Cost_of_insurance;
    medicAsset.Start_Date = tx.Start_Date;
    medicAsset.Insurance_end_date = tx.Insurance_end_date;
    medicAsset.Max_allowed_balance = tx.Max_allowed_balance;
    medicAsset.Available_balance = tx.Max_allowed_balance;
    patient.InsuranceProviders.push(medicAsset)
    return getAssetRegistry(NS+'.MedicInsurance')
    .then(function(ma){
        return ma.add(medicAsset) 
    })
    .then(function(){
        return getParticipantRegistry(NS+'.Patient')
    })
    .then(function(pa){
        return pa.update(patient);
    })
}
/**
 * Encounter booking forProvider visit
 * @param {health.Encounterbooking} encounterbooking
 * @transaction
 */

function encounterbooking(tx){
    
    var factory = getFactory();
    var patient=tx.patient;
    var encounter=tx.encounter_details;
    var NS='health'

    var newEncounter=factory.newConcept(NS,'nextencounter');
    newEncounter.encounterId=encounter.encounterId;
    newEncounter.Provider=encounter.Provider;
    newEncounter.Encounterdate=encounter.Encounterdate;
    newEncounter.symptoms=encounter.symptoms;

    var encounter_asset = factory.newResource(NS,'Encounter',encounter.encounterId)
    encounter_asset.Provider=encounter.Provider;
    encounter_asset.symptoms=encounter.symptoms;
    encounter_asset.Encounterdate=encounter.Encounterdate;
    encounter_asset.patient=patient;
    encounter_asset.patient_status='YETTOVISIT'
    encounter_asset.encounter_status='ACTIVE'
    if(encounter.insuranceProvider){
        newEncounter.insuranceProvider = encounter.insuranceProvider;
        encounter_asset.insuranceProvider = encounter.insuranceProvider;
    }
    patient.current_encounter = newEncounter;
    return getParticipantRegistry('health.Patient')
    .then(function(ca){
        ca.update(patient)
        return getAssetRegistry('health.Encounter')
    })
    .then(function(ca){
        return ca.add(encounter_asset) 
    })
        
 }


/**
 * Transaction when Patient consults the doctor
 * @param {health.Providervisit} providervisit
 * @transaction
 */
function providervisit(tx) {
    var factory = getFactory();
    var NS="health"
    var encounter_asset = tx.encounterId;
    var medicineperiod=tx.medicineperiod
    var prescription=tx.prescription
    if(tx.consultanotherdoctor){
        var consultanotherdoctor=tx.consultanotherdoctor
    }
    if(tx.RecommendedTest){
        var RecommendedTest=tx.RecommendedTest
    }
    var encounter_status=tx.status;
    var provider_id = getCurrentParticipant();
    var patient= encounter_asset.patient;
    encounter_asset.medicineperiod=medicineperiod;
    encounter_asset.prescription=prescription;
    encounter_asset.patient_status = tx.status;
    if(tx.consultanotherdoctor){
        encounter_asset.consultanotherdoctor=consultanotherdoctor
    }
    if(tx.RecommendedTest){ 
        encounter_asset.RecommendedTest=RecommendedTest;
    }
    if(!patient.perviousvisit){
        patient.perviousvisit = [];
    }
    if(encounter_asset.encounter_status=='ACTIVE' && encounter_status=='REVISIT'){
        var date = new Date(encounter_asset.Encounterdate);
        var newdate = new Date(date);
        newdate.setDate(newdate.getDate() +medicineperiod);
        var concept=factory.newConcept(NS,'nextencounter');
        concept.encounterId=encounter_asset.encounterId;
        concept.Provider=encounter_asset.Provider;
        concept.Encounterdate=newdate;
        concept.symptoms=encounter_asset.symptoms;
        delete patient.current_encounter;
        patient.current_encounter=concept;
    }else if(encounter_asset.encounter_status=='ACTIVE' && encounter_status=='VISITED'){
        patient.perviousvisit.push(encounter_asset)
        delete patient.current_encounter;
    }

    return getParticipantRegistry('health.Patient')
    .then(function(ca){
        return ca.update(patient)
    })
    .then(function(){
        return getAssetRegistry('health.Encounter')
    })
    .then(function(ca){
        if(encounter_asset.encounter_status=='ACTIVE' && encounter_status=='REVISIT'){
             return ca.update(encounter_asset);
        }else if(encounter_asset.encounter_status=='ACTIVE' && encounter_status=='VISITED'){
            encounter_asset.encounter_status='INACTIVE'
            return ca.update(encounter_asset);
        }
    }) 
}


 /**
 * medicalvisit transaction
 * @param {health.Change_encounter_status} changeEncounterStatus
 * @transaction
 */
 function changeEncounterStatus(tx){

    var encounterAsset=tx.Encounter;
    var Status=tx.Status
    var factory=getFactory()
    return getAssetRegistry('health.Encounter')
    .then(function(ca){
        /*var newstatus=factory.newConcept('health','Status')
        newstatus.Status=Status.Status
        newstatus.reason=Status.reason
        if(Status.nextappointmentdate==""){
        encounterAsset.Status.push(newstatus)
        }else {
            newstatus.nextappointmentdate=Status.nextappointmentdate;
            encounterAsset.Status.push(newstatus)
        }*/
        encounterAsset.Status = Status;
        return ca.update(encounterAsset);
    })
 }
 /***
 * Patients Claim insurance transaction
 * @param {health.Claim_Insurance} claimInsurance
 * @transaction
 */
function claimInsurance(tx){
    var factory = getFactory()
    var encounterAsset = tx.encounterId;
    var medicInsurance = tx.insuranceId
    var patient = getCurrentParticipant();
    if(encounterAsset.encounter_status != "INACTIVE"){
        throw new Error(" Encounter is still Active... Cannot process this request now :(")
    }
    if(patient.MrnNumber != medicInsurance.patient.MrnNumber){
        throw new Error("Insurace specified does not belongs to You")
    }
    if(patient.MrnNumber != encounterAsset.patient.MrnNumber){
        throw new Error("Encounter specified is not Yours");
    }
    if(encounterAsset.insuranceProvider){
        if(encounterAsset.insuranceProvider != medicInsurance.InsuranceCompanyId){
            throw new Error("The insurer specified does not match with the insurer in Encounter")
        }
    }
    if(tx.request_claimming_amount > medicInsurance.Available_balance){
        throw new Error("Claiming Amount is more than the Available Balance in your insurance");
    }
    var claim = factory.newConcept('health','Requests');
    claim.Encounter_id = tx.encounterId;
    claim.Claiming_Amount = tx.request_claimming_amount;
    if(!medicInsurance.Claim_requests){
        medicInsurance.Claim_requests = [];
    }
    medicInsurance.Claim_requests.push(claim);
    return getAssetRegistry("health.MedicInsurance")
    .then(function(ma){
        ma.update(medicInsurance);
        return getAssetRegistry("health.Encounter")
    })
    .then(function(ea){
        encounterAsset.insuranceProvider = medicInsurance.InsuranceCompanyId
        return ea.update(encounterAsset);
    })
}

/***
 * Patients Claim insurance transaction
 * @param {health.Approve_insurance} approveInsurance
 * @transaction
 */

 function approveInsurance(tx){
    var factory = getFactory()
    var encounterAsset = tx.encounterId;
    var medicInsurance = tx.insuranceId
    var patient = medicInsurance.patient;
    if(encounterAsset.encounter_status != "INACTIVE"){
        throw new Error(" Encounter is still Active... Cannot process this request now :(")
    }
    if(patient.MrnNumber != medicInsurance.patient.MrnNumber){
        throw new Error("Insurace specified does not belongs to You")
    }
    if(patient.MrnNumber != encounterAsset.patient.MrnNumber){
        throw new Error("Encounter specified is not Yours");
    }
    if(encounterAsset.insuranceProvider){
        if(encounterAsset.insuranceProvider != medicInsurance.InsuranceCompanyId){
            throw new Error("The insurer specified does not match with the insurer in Encounter")
        }
    }
    if(tx.claimming_amount > medicInsurance.Available_balance){
        throw new Error("Claiming Amount is more than the Available Balance in your insurance");
    }
    var claim = factory.newConcept('health','Claims');
    claim.Encounter_id = tx.encounterId;
    claim.used_balance = tx.claimming_amount;
    if(tx.remarks){
        claim.Remarks = tx.remarks;
    }
    if(!medicInsurance.Claims){
        medicInsurance.Claims = [];
    }
    medicInsurance.Claims.push(claim);
    medicInsurance.Available_balance = medicInsurance.Available_balance-tx.claimming_amount;
    return getAssetRegistry("health.MedicInsurance")
    .then(function(ma){
        return ma.update(medicInsurance);
    })
 }

 /***
 * Patients Claim insurance transaction
 * @param {health.AddInsurance} addInsurance
 * @transaction
 */

 function addInsurance(tx){
    var insurance = tx.insuranceId;
    var patient = getCurrentParticipant();
    if(!patient.InsuranceProviders){
        patient.InsuranceProviders = []
    }
    patient.InsuranceProviders.push(insurance);
    return getParticipantRegistry('health.Patient')
    .then(function(pa){
        return pa.update(patient);
    })
 }

 /***
 * Patients Claim insurance transaction
 * @param {health.RemoveInsurer} removeInsurer
 * @transaction
 */

function removeInsurer(tx){
    var insurance = tx.insuranceId;
    var insuranceID = insurance.getIdentifier()
    var patient = getCurrentParticipant();
    if(!patient.InsuranceProviders){
        throw new Error("No Insurer to Delete")
    }
    patient.InsuranceProviders.splice(patient.InsuranceProviders.indexOf("resource:health.MedicInsurance#"+insuranceID),1);
    return getParticipantRegistry('health.Patient')
    .then(function(pa){
        return pa.update(patient);
    })
 }
 /***
 * Patients Claim insurance transaction
 * @param {health.AddPermissionToId} addPermissionToId
 * @transaction
 */

function addPermissionToId(tx){
    var factory = getFactory();
    var pType = tx.sharingWith;
    var id= tx.id;
    var patient = getCurrentParticipant();
    if(!patient.sharingDetails){
        patient.sharingDetails = []
    }
    //var nr = factory.newRelationship('health',pType,id)
    var nr = "health."+pType+"#"+id;
    patient.sharingDetails.push(nr);
    return getParticipantRegistry('health.Patient')
    .then(function(pa){
        return pa.update(patient);
    })
 }
 /***
 * Patients Claim insurance transaction
 * @param {health.RevokeSharing} revokeSharing
 * @transaction
 */

 function revokeSharing(tx){
    var pType = tx.sharingWith;
    var id= tx.id;
    var patient = getCurrentParticipant();
    if(!patient.sharingDetails){
        throw new Error("Not sahring with anyone")
    }
    var index = patient.sharingDetails.indexOf("health."+pType+"#"+id)
    //throw new Error(index)
    patient.sharingDetails.splice(index,1);
    return getParticipantRegistry('health.Patient')
    .then(function(pa){
        return pa.update(patient);
    })
 }

 /***
 * Patients Claim insurance transaction
 * @param {health.ChangeProvider} changeProvider
 * @transaction
 */

function changeProvider(tx){
    var provider = tx.providerId
    var patient = getCurrentParticipant();
    patient.FamilyProvider = provider;
    return getParticipantRegistry('health.Patient')
    .then(function(pa){
        return pa.update(patient);
    })
 }

 /**
  * Demo 
  * @param {health.Demo} demo
  * @transaction
  */
 
function demo(tx){
    var factory = getFactory();
    var ns = "health"
    var date = new Date("08-16-1995");
    var patient1 = factory.newResource(ns,'Patient','mnr001')
    var provider = factory.newResource(ns,'Provider','prvdr001');
    var insurer = factory.newResource(ns,'InsuranceProvider','ip001');
    var medicAsset = factory.newResource(ns,'MedicInsurance','mi001');

    insurer.insuranceCompanyName = "ASDF Health Insurance"
    var iAddress = factory.newConcept(ns,'Address');
    iAddress.addressLine1 = "Flat.no:80";
    iAddress.addressLine2 ="techno enclave";
    iAddress.city = "Hyderabad";
    iAddress.state = "Telangana";
    iAddress.country = "India";
    iAddress.zip = "500080";
    insurer.location = iAddress;

    provider.name = "Sam"
    provider.specialist = "Pediatrician";
    provider.Experience = 3
    var education = factory.newConcept(ns,'Education');
    education.degree_name = "MBBS";
    education.college = "JKL Medical college";
    education.completed_year = "2014";
    provider.education = education;
    

    patient1.FullName = "Jim";
    patient1.Dob = date;
    patient1.Age = 24
    patient1.Emailid = "jim@gmail.com";
    patient1.Gender = "Male";
    patient1.Ethnicity = "Hindu";
    patient1.BloodType = "o+";
    patient1.Phone = "92498551685";
    var pAddress = factory.newConcept(ns,'Address');
    pAddress.addressLine1 = "H.no:1-112";
    pAddress.addressLine2 ="Xyz colony";
    pAddress.city = "Hyderabad";
    pAddress.state = "Telangana";
    pAddress.country = "India";
    pAddress.zip = "500080";

    patient1.Address = pAddress;
    patient1.FamilyProvider = provider;
    return getParticipantRegistry(ns+'.Provider')
    .then(function(pda){
        return pda.add(provider);
    })
    .then(function(){
        return getParticipantRegistry(ns+'.InsuranceProvider');
    })
    .then(function(ipa){
        return ipa.add(insurer);
    })
    .then(function(){
        return getParticipantRegistry(ns+'.Patient');
    })
    .then(function(pa){
        return pa.add(patient1);
    })
}