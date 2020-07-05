import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  ImageBackground,
  Platform,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useDispatch, useSelector } from 'react-redux';
import ProfileApi from '../../services/Student/Profile';
import { profileAction, mattersEnrolledAction } from '../../store/actions/student/ProfileActions';
import { Accordion, Block, Text, theme } from "galio-framework";

import { createResponse } from '../../helpers/Response'
import { useFormFields } from '../../helpers/FormFields';
import { Notify } from '../../helpers/Notify';
import { Button, Notification } from "../../components";
import { Images, argonTheme } from "../../constants";
import { HeaderHeight } from "../../constants/utils";

const { width, height } = Dimensions.get("screen");

const thumbMeasure = (width - 48 - 32) / 3;

function Profile({ navigation }) {

  const dispatch = useDispatch();
  const studentProfile = useSelector(state => state.profile);
  const isAuth = useSelector(state => state.auth.isAuth);

  const [profile, setProfile] = useState(studentProfile.profile);
  const [refreshing, setRefreshing] = useState(studentProfile.loading);
  const [matters, setMatters] = useState(studentProfile.matters);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('');
  const [toastShow, setToastShow] = useFormFields({
		show: false,
		type: 'error',
		message: ''
  })
  
  const handleNotification = (type, message) => {
		Notify(type, message, toastShow, setToastShow);
	}

  const handleRefreshProfile = () => {
    dispatch(profileAction());
    dispatch(mattersEnrolledAction());
  }

  const handleAccessFiles = async () => {
    const horarioFile = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
    })
    if(horarioFile.type === 'success') {

      handleNotification('info', 'Se esta cargando su horario.')

      const formData = new FormData();
      formData.append('horario', {
        uri: horarioFile.uri,
        name: horarioFile.name,
        type: 'application/pdf'
      });

      setLoading(true)
      ProfileApi.postHorario(formData)
        .then(resp => {
          dispatch(mattersEnrolledAction());
          handleNotification('success', 'Horario cargado con éxito.')
          setLoading(false)
        })
        .catch(error => {
          if(error.response.status === 422 && error.response.data.hasOwnProperty('message')) {
            handleNotification('error', error.response.data.message)
          }else if(error.response.status === 500) {
            alert('¡Ups!, ha ocurrido un problema. Asegurese de que sea un horario o por favor vuelve a descargarlo e intenta nuevamente. Si el problema persiste intenta desde https://spa.asiunerg.me')
          }
          setLoading(false)
        })
    }
    return;
  }

  const handleAccessCamera = async () => {
    const userPermission = await ImagePicker.getCameraRollPermissionsAsync()
    if(!userPermission.granted){
      if(userPermission.canAskAgain){
        const responsePermission = await ImagePicker.requestCameraRollPermissionsAsync()
        if(!responsePermission.granted) {
          alert('Debe dar permisos para poder realizar esta acción.')
        }
      }else{
        alert('Debe dar permisos para poder realizar esta acción.')
      }
      return;
    }

    const imageAvatar = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    })

    if(!imageAvatar.cancelled) {
      const formData = new FormData();
      formData.append('avatar', {
        uri: imageAvatar.uri,
        name: 'avatar.jpg',
        type: 'image/jpg'
      });

      setLoading(true)
      handleNotification('info', 'Se esta cargando su imagen de perfil.')
      const responseAvatar = await ProfileApi.postAvatar(formData)
      if(responseAvatar.status === 201) {
        dispatch(profileAction());
        handleNotification('success', 'Imagen de perfil cargada con éxito.')
        setLoading(false)
      }else{
        alert('¡ Lo sentimos, algo salió mal !')
        setLoading(false)
      }
    }
    return;
  }

  const getPeriodActive = () => {
    ProfileApi.getPeriodActive()
      .then(resp => {
        const response = createResponse(resp).data.data
        setPeriod(response.period);
      })
      .catch(error => {
        console.log(error)
      })
  }

  useEffect(() => {
    if (isAuth && profile.user.email === "") {
      dispatch(profileAction());
      dispatch(mattersEnrolledAction());
    }
  }, [dispatch, profile])

  useEffect(() => {
    setProfile(studentProfile.profile);
  }, [studentProfile.profile])

  useEffect(() => {
    setRefreshing(studentProfile.loading);
  }, [studentProfile.loading])

  useEffect(() => {
    setMatters(studentProfile.matters.map(dt => ({
      title: dt.name,
      content: `código: ${dt.code} - sección: ${dt.section}`
    })))
  }, [studentProfile.matters])

  useEffect(() => {
    getPeriodActive()
  },[])

  return (
    <Block flex style={styles.profile}>
      <Block flex>
        <ImageBackground
          source={Images.ProfileBackground}
          style={styles.profileContainer}
          imageStyle={styles.profileBackground}
        >
          <SafeAreaView
            style={{ flex: 1 }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ width, marginTop: '25%' }}
              horizontal={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefreshProfile} />}
            >
              <Block flex style={styles.profileCard}>
			        	<Notification isShow={toastShow.show} message={toastShow.message} positionIndicator="top" color={toastShow.type} />
                <Block middle style={styles.avatarContainer}>
                  <TouchableOpacity onPress={() => handleAccessCamera()}>
                    <Image
                      source={{ uri: profile.user.avatar }}
                      style={styles.avatar}
                    />
                  </TouchableOpacity>
                </Block>
                <Block style={styles.info}>
                  <Block
                    middle
                    row
                    space="evenly"
                    style={{ marginTop: 20, paddingBottom: 24 }}
                  >
                    <Button
                      uppercase
                      style={{ backgroundColor: argonTheme.COLORS.ERROR, width: width * 0.3, marginHorizontal: width * 0.1 }}
                      onPress={() => navigation.navigate('Absence', {
                        screen: 'AbsenceTab',
                        params: {
                          screen: 'FormAbsence'
                        }
                      })}
                      loading={loading}
                      disabled={loading}
                    >
                      inf ausencia
                  </Button>

                    <Button
                      onPress={() => handleAccessFiles()}
                      style={{ backgroundColor: argonTheme.COLORS.SUCCESS, width: width * 0.3, marginHorizontal: width * 0.1 }}
                      loading={loading}
                      disabled={loading}
                    >
                      SUBIR HORARIO
                  </Button>
                  </Block>
                  <Block row space="between">
                    <Block middle>
                      <Text
                        bold
                        size={18}
                        color="#525F7F"
                        style={{ marginBottom: 4 }}
                      >
                        {(profile.presents_count === 0) ? 'S/R' : profile.presents_count}
                      </Text>
                      <Text size={12} color={argonTheme.COLORS.TEXT}>Asistencias</Text>
                    </Block>
                    <Block middle>
                      <Text
                        bold
                        color="#525F7F"
                        size={18}
                        style={{ marginBottom: 4 }}
                      >
                        {(profile.absents_count === 0) ? 'S/R' : profile.absents_count}
                      </Text>
                      <Text size={12} color={argonTheme.COLORS.TEXT}>Inasistencias</Text>
                    </Block>
                    <Block middle>
                      <Text
                        bold
                        color="#525F7F"
                        size={18}
                        style={{ marginBottom: 4 }}
                      >
                        {(profile.inscriptions_count === 0) ? 'S/R' : profile.inscriptions_count}
                      </Text>
                      <Text size={12} color={argonTheme.COLORS.TEXT}>Cursadas</Text>
                    </Block>
                  </Block>
                </Block>
                <Block flex>
                  <Block middle style={styles.nameInfo}>
                    <Text bold size={28} color="#32325D">
                      {profile.student.name}
                    </Text>
                    <Text size={16} color="#32325D" style={{ marginTop: 5 }}>
                      {profile.student.lastname}
                    </Text>
                    <Text size={16} color="#32325D" style={{ marginTop: 5 }}>
                      Periodo activo: {period}
                    </Text>
                  </Block>
                  <Block middle style={{ marginTop: 30, marginBottom: 10 }}>
                    <Block style={styles.divider} />
                  </Block>
                  <Block middle>
                    <Text
                      size={16}
                      color="#525F7F"
                      style={{ textAlign: "center", marginBottom: 20 }}
                    >
                      {`Area de Ingeniería en Sistemas`}
                    </Text>
                  </Block>
                  <Block
                    row
                    style={{ paddingVertical: 14, alignItems: "baseline" }}
                  >
                    <Text bold size={16} color="#525F7F">
                      Materias
                  </Text>
                  </Block>
                  <Block>
                    <Accordion dataArray={matters} />
                  </Block>
                </Block>
              </Block>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </Block>
    </Block>
  );
}

const styles = StyleSheet.create({
  profile: {
    marginTop: Platform.OS === "android" ? -HeaderHeight : 0,
    // marginBottom: -HeaderHeight * 2,
    flex: 1
  },
  profileContainer: {
    width: width,
    height: height,
    padding: 0,
    zIndex: 1
  },
  profileBackground: {
    width: width,
    height: height / 2
  },
  profileCard: {
    // position: "relative",
    padding: theme.SIZES.BASE,
    marginHorizontal: theme.SIZES.BASE,
    marginTop: 65,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: theme.COLORS.WHITE,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.2,
    zIndex: 2
  },
  info: {
    paddingHorizontal: 40
  },
  avatarContainer: {
    position: "relative",
    marginTop: -80
  },
  avatar: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 0
  },
  nameInfo: {
    marginTop: 35
  },
  divider: {
    width: "90%",
    borderWidth: 1,
    borderColor: "#E9ECEF"
  },
  thumb: {
    borderRadius: 4,
    marginVertical: 4,
    alignSelf: "center",
    width: thumbMeasure,
    height: thumbMeasure
  }
});

export default Profile;
