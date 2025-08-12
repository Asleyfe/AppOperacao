import { Tabs } from 'expo-router';
import { Users, ClipboardList, MonitorSpeaker, ChartBar as BarChart3, Upload } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

export default function TabLayout() {
  const { colaborador } = useAuth();
  const isEncarregado = colaborador?.funcao?.toUpperCase().includes('ENCARREGADO');

  return (
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 90,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Equipe',
          tabBarIcon: ({ size, color }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="servicos"
        options={{
          title: 'Serviços',
          tabBarIcon: ({ size, color }) => (
            <ClipboardList size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => (
            <MonitorSpeaker size={size} color={color} />
          ),
          href: isEncarregado ? null : '/dashboard',
        }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ size, color }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="importar"
        options={{
          title: 'Importar',
          tabBarIcon: ({ size, color }) => (
            <Upload size={size} color={color} />
          ),
          href: isEncarregado ? null : '/importar',
        }}
      />    </Tabs>
  );
}