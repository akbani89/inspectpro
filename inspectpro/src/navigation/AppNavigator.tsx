import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import InspectionsScreen from '../screens/InspectionsScreen';
import NewInspectionScreen from '../screens/NewInspectionScreen';
import InspectionDetailScreen from '../screens/InspectionDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 6,
          height: 60,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: any = {
            Dashboard:   focused ? 'home'             : 'home-outline',
            Inspections: focused ? 'documents'        : 'documents-outline',
            Profile:     focused ? 'person-circle'    : 'person-circle-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard"   component={DashboardScreen} />
      <Tab.Screen name="Inspections" component={InspectionsScreen} />
      <Tab.Screen name="Profile"     component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs"             component={TabNavigator} />
      <Stack.Screen name="NewInspection"    component={NewInspectionScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="InspectionDetail" component={InspectionDetailScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigation() {
  const { token, isLoading, loadStoredSession } = useAuthStore();

  useEffect(() => {
    loadStoredSession();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token
          ? <Stack.Screen name="App"   component={AppNavigator} />
          : <Stack.Screen name="Login" component={LoginScreen}  />
        }
      </Stack.Navigator>
    </NavigationContainer>
  );
}
