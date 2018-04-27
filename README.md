# health

it is network for patient and doctor 
    {
    "$class": "health.appointmentbooking",
    "details": {
        "$class": "health.nextappointment",
        "appointmentId": "ap_1",
        "Doctor": "resource:health.Doctor#D_1",
        "Appointmentdate": "2018-05-10T12:34:05.707Z",
        "symptoms": "stomach pain"
    },
    "patient": "resource:health.patient#p_1"
    }
{
  "$class": "health.Insuranceregistry",
  "Insurance": {
    "$class": "health.MedicInsurance",
    "InsuranceId": "ip_icic",
    "InsuranceCompany": "archents",
    "Costofinsurance": 4000,
    "StartofTime": "2012-04-12T06:20:33.719Z",
    "EndofTime": "2019-04-12T06:20:33.719Z",
    "patient": "resource:health.patient#p_1"
  },
  "patient": "resource:health.patient#p_1"
}


    {
  "$class": "health.Doctorvisit",
  "Doctorvisit": {
    "$class": "health.Appointment",
    "appointmentId": "ap_1",
    "Doctor": "resource:health.Doctor#D_1",
    "symptoms": "stomach pain",
    "Appointmentdate": "2018-04-11T07:37:22.698Z",
    "medicineperiod": 5,
    "prescription": "paracetamol"
  },
  "patient": "resource:health.patient#p_1"
}


////creating business network for composer file (.bna)

yo hyperledger-composer:businessnetwork