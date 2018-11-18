import { h, Component } from 'preact'
import { TabView, Tab } from '../../widgets/tabview';
import { PaymentsManagement } from './paymentsmanagement';
import { CreditCardsManagement } from './creditcardsmanagement';

const PaymentDashboard = props => (
    <TabView>
        <Tab title='Pending Payments'>
            <PaymentsManagement />
        </Tab>
        <Tab title='Credit Cards Management'>
            <CreditCardsManagement />
        </Tab>
    </TabView>
);

export default PaymentDashboard;
