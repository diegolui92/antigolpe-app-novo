import { useEffect } from 'react';
import {
View,
ActivityIndicator
} from 'react-native';

import { supabase } from '../services/supabase';
import { useRouter } from 'expo-router';

export default function Index(){

const router=useRouter();

useEffect(()=>{

verificar();

},[]);

async function verificar(){

try{

const {data}=await
supabase.auth.getSession();

if(data.session){

router.replace('/home');

}else{

router.replace('/login');

}

}catch{

router.replace('/login');

}

}

return(

<View
style={{
flex:1,
justifyContent:"center",
alignItems:"center",
backgroundColor:"#020617"
}}
>

<ActivityIndicator
size="large"
color="#22c55e"
/>

</View>

);

}